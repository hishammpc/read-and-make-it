// Write paths: account status switch, duplicate email, bulk import. Puts the local data back afterwards.
import assert from 'node:assert/strict';
import { check } from '../harness.mjs';

export default async function actions({ E, load, sql }) {
  const { fetchUsersWithTrainingHours } = await load('/src/hooks/useUsers.ts');
  const zeroId = sql("select id from profiles where email = 'zero@test.my'");
  const targetCount = async () => (await fetchUsersWithTrainingHours(2026)).filter((u) => u.status === 'active' && !u.is_admin).length;

  try {
    console.log('Account status switch');
    await check('deactivate: status inactive, target staff 1,106 → 1,105; reactivate restores', async () => {
      assert.equal(await targetCount(), 1106);
      await E.setUserStatus().mutateAsync({ id: zeroId, status: 'inactive' });
      assert.equal(sql(`select status from profiles where id = '${zeroId}'`), 'inactive');
      assert.equal(await targetCount(), 1105);
      await E.setUserStatus().mutateAsync({ id: zeroId, status: 'active' });
      assert.equal(sql(`select status from profiles where id = '${zeroId}'`), 'active');
      assert.equal(await targetCount(), 1106);
    });

    console.log('Create user with an existing email');
    await check('rejects with a unique violation (23505) → friendly toast path', async () => {
      await assert.rejects(E.createUser().mutateAsync({ name: 'Dup', email: 'AWATIF@test.my' }), (e) => e.code === '23505');
      assert.equal(sql("select count(*) from profiles where lower(email) = 'awatif@test.my'"), '1');
    });

    console.log('Bulk import');
    sql("update profiles set email = 'Aziz@Test.my' where email = 'aziz@test.my'"); // mixed case on record
    const csv = [
      'BIL,NAMA,JAWATAN,EMEL',
      '1,Baru Satu,Pegawai,baru1@test.my',
      '2,Baru Satu Lagi,Pegawai,BARU1@test.my',
      '3,Abdul Aziz Abdul Jalil,,aziz@test.my',
      '4,Baru Dua,Juruteknik,baru2@test.my',
    ].join('\n');
    const file = new File([csv], 'staf.csv', { type: 'text/csv' });
    const uploader = sql("select id from profiles where email = 'admin@test.my'");
    await check('2 created, 1 updated, 1 failed (duplicate in file) — batch not blocked', async () => {
      const result = await E.bulkImport().mutateAsync({ file, uploadedBy: uploader });
      assert.deepEqual([result.created, result.updated, result.failed], [2, 1, 1]);
      assert.match(result.errors[0].error, /Duplicate email in this file \(same as row 2\)/);
    });
    await check('new users exist once each with the employee role', () => {
      assert.equal(
        sql("select count(*) from profiles p join user_roles r on r.user_id = p.id where p.email in ('baru1@test.my','baru2@test.my') and r.role = 'employee'"),
        '2'
      );
    });
    await check('mixed-case existing email matched (no second Aziz); blank JAWATAN kept "Pegawai"', () => {
      assert.equal(sql("select count(*) from profiles where lower(email) = 'aziz@test.my'"), '1');
      assert.equal(sql("select position from profiles where lower(email) = 'aziz@test.my'"), 'Pegawai');
    });
  } finally {
    // Put the local data back so a re-run of the other suites keeps its counts
    sql("delete from user_roles where user_id in (select id from profiles where email in ('baru1@test.my','baru2@test.my'))");
    sql("delete from profiles where email in ('baru1@test.my','baru2@test.my')");
    sql("update profiles set email = 'aziz@test.my' where lower(email) = 'aziz@test.my'");
    sql("update profiles set status = 'active' where email = 'zero@test.my'");
    sql('delete from bulk_uploads');
  }
}
