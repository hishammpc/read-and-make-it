// Staff and supervisor screens rendered with their real hooks, signed in as fake staff.
import assert from 'node:assert/strict';
import { check, tableRows, text } from '../harness.mjs';

const firstWords = (rows, n) => rows.map((r) => r.split(' ').slice(0, n).join(' '));

export default async function staffPages({ page, pages: P, row, setUser }) {
  const awatif = await row('profiles', 'email', 'awatif@test.my', 'id, name, email');
  const sup1 = await row('profiles', 'email', 'sup1@test.my', 'id, name, email');
  const pA = (await row('programs', 'title', 'Program A')).id;
  const pB = (await row('programs', 'title', 'Program B')).id;

  console.log("My trainings (A'watif)");
  setUser(awatif);
  const myTrainings = (query) => page(P.MyTrainings, '/dashboard/my-trainings', `/dashboard/my-trainings${query}`);
  const mt = await myTrainings('?year=2026');
  await check('2026: B then A (newest first), "2 program · 33 jam", cross-year program not listed', () => {
    assert.deepEqual(firstWords(tableRows(mt), 2), ['Program B', 'Program A']);
    assert.match(text(mt), /2 program · 33 jam/);
    assert.ok(!/Rentas Tahun/.test(text(mt)));
  });
  await check('2025: the cross-year program', async () =>
    assert.deepEqual(firstWords(tableRows(await myTrainings('?year=2025')), 3), ['Program Rentas Tahun']));
  await check('sort=hours: B (13) before A (20); evaluated A shows Selesai, B shows Jawab', async () => {
    const rows = tableRows(await myTrainings('?year=2026&sort=hours'));
    assert.match(rows[0], /^Program B .* 13 j Jawab/);
    assert.match(rows[1], /^Program A .* 20 j Selesai/);
  });

  console.log("My hours (A'watif)");
  const myHours = (query) => page(P.MyHours, '/dashboard/my-hours', `/dashboard/my-hours${query}`);
  const mh = await myHours('?year=2026');
  await check('2026: 33 jam; programs A then B (date order)', () => {
    assert.match(text(mh), /Jam selesai 33 jam Tahun 2026/);
    assert.deepEqual(firstWords(tableRows(mh), 2), ['Program A', 'Program B']);
  });
  await check('2025: 7 jam, the cross-year program', async () => {
    const html = await myHours('?year=2025');
    assert.match(text(html), /Jam selesai 7 jam/);
    assert.equal(tableRows(html).length, 1);
  });

  console.log('Program evaluation form');
  const evaluationForm = (programId) =>
    page(P.EvaluationForm, '/dashboard/my-evaluations/:programId/submit', `/dashboard/my-evaluations/${programId}/submit`);
  await check('already evaluated (Program A): message, not the form', async () => {
    const t = text(await evaluationForm(pA));
    assert.match(t, /Penilaian telah dihantar/);
    assert.ok(!/Program ini mencapai objektif/.test(t));
  });
  await check('not yet evaluated (Program B): the form', async () =>
    assert.match(text(await evaluationForm(pB)), /Program ini mencapai objektif/));

  console.log('Staff dashboard + menu');
  await check("A'watif: leaderboard loaded (not 'empty'); no 'Pasukan saya' in the menu", async () => {
    const t = text(await page(P.EmployeeDashboard, '/dashboard', '/dashboard'));
    assert.match(t, /Staf Empat Puluh/);
    assert.ok(!/Pasukan saya/.test(t));
  });

  console.log('My team (supervisor Halimahton)');
  setUser(sup1);
  await check("supervisor's menu shows 'Pasukan saya'", async () =>
    assert.match(text(await page(P.EmployeeDashboard, '/dashboard', '/dashboard')), /Pasukan saya/));
  const myTeam = (query) => page(P.MyTeam, '/dashboard/my-team', `/dashboard/my-team${query}`);
  const team = await myTeam('?year=2026');
  await check('1,102 members (ids batched); tiles 1 / 1,101 / 0', () => {
    assert.equal(tableRows(team).length, 1102);
    const t = text(team);
    assert.match(t, /Ahli pasukan 1102/);
    assert.match(t, /Capai 40 jam 1 /);
    assert.match(t, /Belum capai 40 jam 1101/);
    assert.match(t, /Tiada jam latihan 0/);
  });
  await check('target=met: Staf Empat Puluh only', async () =>
    assert.deepEqual(firstWords(tableRows(await myTeam('?year=2026&target=met')), 3), ['Staf Empat Puluh']));
  await check("q=raidah: A'watif, 33 j, 7 j to go", async () => {
    const rows = tableRows(await myTeam('?year=2026&q=raidah'));
    assert.equal(rows.length, 1);
    assert.match(rows[0], /A'watif Raidah Ermansyah Pegawai 33 j 7 j/);
  });

  console.log('Staff evaluations (supervisor Halimahton)');
  const supervisee = (query = '') =>
    page(P.SuperviseeEvaluations, '/dashboard/supervisee-evaluations', `/dashboard/supervisee-evaluations${query}`);
  await check('2026: pending staff first, then completed by name; View on completed', async () => {
    const rows = tableRows(await supervisee());
    assert.deepEqual(rows.map((r) => r.split(' ')[0]), ['Pukal', "A'watif", 'Staf']);
    assert.ok(!/Lihat/.test(rows[0]));
    assert.match(rows[1], /98% · Cemerlang Lihat/);
  });
  await check('status=completed via tile filter: 2 rows', async () =>
    assert.equal(tableRows(await supervisee('?status=completed')).length, 2));
  await check('q=staf: Staf Empat Puluh', async () =>
    assert.deepEqual(firstWords(tableRows(await supervisee('?q=staf')), 2), ['Staf Empat']));
}
