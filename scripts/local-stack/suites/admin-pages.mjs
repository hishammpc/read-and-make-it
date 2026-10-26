// Admin screens rendered with their real hooks; checks what's on screen.
import assert from 'node:assert/strict';
import { check, tableRows, text } from '../harness.mjs';

const userRowNames = (html) =>
  [...html.matchAll(/href="\/admin\/users\/[^"]+\/edit"[^>]*>([^<]+)</g)].map((m) => m[1].replace(/&#x27;/g, "'"));
const firstWords = (rows, n) => rows.map((r) => r.split(' ').slice(0, n).join(' '));

export default async function adminPages({ page, pages: P, row, setUser }) {
  const admin = await row('profiles', 'email', 'admin@test.my', 'id, name, email');
  setUser(admin, 'admin');
  const pA = (await row('programs', 'title', 'Program A')).id;
  const cycle = (await row('annual_evaluation_cycles', 'year', 2026)).id;
  const users = (url) => page(P.UsersList, '/admin/users', url);

  console.log('Users');
  const all = await users('/admin/users');
  await check('renders all 1,108 users, tiles 1,106 / 1 / 1,105 / 3', () => {
    assert.equal(userRowNames(all).length, 1108);
    const t = text(all);
    for (const [label, n] of [['Kakitangan aktif', '1106'], ['Capai 40 jam', '1'], ['Belum capai 40 jam', '1105'], ['Tiada jam latihan', '3']]) {
      assert.match(t, new RegExp(`${label} ${n}\\b`), `${label} should show ${n}`);
    }
    assert.match(t, /Menunjukkan 1108 daripada 1108 pengguna/);
  });
  await check('default order is by name; admin shows a Pentadbir badge', () => {
    assert.equal(userRowNames(all)[0], "A'watif Raidah Ermansyah");
    assert.match(text(all), /Admin Ujian Pentadbir/);
  });
  await check('remaining column: Aziz "33 j", Forty "Capai", leaver "—"', () => {
    const t = text(all);
    assert.match(t, /Abdul Aziz Abdul Jalil aziz@test\.my Isram Azhar Aktif 7 j 33 j/);
    assert.match(t, /Staf Empat Puluh forty@test\.my Halimahton Sa'diah Let Aktif 40 j Capai/);
    assert.match(t, /Zainal Bersara leaver@test\.my Isram Azhar Tidak aktif 20 j —/);
  });
  await check('?target=below&sort=hours (dashboard link): 1,105 rows, 0 h first, no admin/leaver/Forty', async () => {
    const below = await users('/admin/users?target=below&sort=hours');
    const names = userRowNames(below);
    assert.equal(names.length, 1105);
    assert.deepEqual(names.slice(0, 3).sort(), ["Halimahton Sa'diah Let", 'Isram Azhar', 'Staf Kosong'].sort());
    assert.ok(!names.includes('Admin Ujian') && !names.includes('Zainal Bersara') && !names.includes('Staf Empat Puluh'));
    assert.equal(names[names.length - 1], "A'watif Raidah Ermansyah"); // 33 h, the most below 40
    assert.match(below, /aria-sort="ascending"/);
  });
  await check("?sort=-hours: highest first (Staf Empat Puluh 40 h, then A'watif 33 h)", async () => {
    const html = await users('/admin/users?sort=-hours');
    assert.deepEqual(userRowNames(html).slice(0, 2), ['Staf Empat Puluh', "A'watif Raidah Ermansyah"]);
    assert.match(html, /aria-sort="descending"/);
  });
  await check('?sup=none&status=active: active users without a supervisor only', async () => {
    const names = userRowNames(await users('/admin/users?sup=none&status=active'));
    assert.deepEqual(names.sort(), ['Admin Ujian', "Halimahton Sa'diah Let", 'Isram Azhar', 'Staf Kosong'].sort());
  });
  await check('?q=aziz: search still works', async () =>
    assert.deepEqual(userRowNames(await users('/admin/users?q=aziz')), ['Abdul Aziz Abdul Jalil']));
  await check('no match: "Tiada padanan" + clear filters', async () => {
    const t = text(await users('/admin/users?q=nobody-matches'));
    assert.match(t, /Tiada padanan/);
    assert.match(t, /Kosongkan penapis/);
  });

  console.log('Admin dashboard');
  await check('below-40 tile shows 1,105 of 1,106', async () =>
    assert.match(text(await page(P.AdminDashboard, '/dashboard', '/dashboard')), /Belum capai 40 jam 1105 daripada 1106 kakitangan aktif/));

  console.log('Reports');
  await check('opens on the staff hours summary, 4 tabs', async () => {
    const html = await page(P.Reports, '/dashboard/reports', '/dashboard/reports');
    assert.equal((html.match(/role="tab"/g) || []).length, 4);
    const activeTab = html.match(/<button[^>]*role="tab"[^>]*aria-selected="true"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
    assert.match(activeTab, /Ringkasan jam kakitangan/, 'active tab: ' + text(activeTab));
  });

  console.log('Programs list');
  const programs = (url) => page(P.ProgramsList, '/dashboard/programs', url);
  const p2026 = await programs('/dashboard/programs?year=2026');
  await check('2026: 6 programs, newest first (31 Dis), footer totals', () => {
    const rows = tableRows(p2026);
    assert.equal(rows.length, 6);
    assert.match(rows[0], /^Program 31 Dis/);
    const foot = text(p2026.match(/<tfoot[\s\S]*?<\/tfoot>/)?.[0] ?? '').trim();
    assert.match(foot, /Jumlah 62 j 1108/, foot); // hours 20+13+4+20+3+2 / participants
  });
  await check('all years: 8 programs', async () => assert.equal(tableRows(await programs('/dashboard/programs?year=all')).length, 8));
  await check('type=International: Program D only, type column says Antarabangsa', async () => {
    const rows = tableRows(await programs('/dashboard/programs?year=2026&type=International'));
    assert.equal(rows.length, 1);
    assert.match(rows[0], /^Program D .*Antarabangsa/);
  });
  await check('eval=required: A, B, D', async () =>
    assert.deepEqual(firstWords(tableRows(await programs('/dashboard/programs?year=2026&eval=required&sort=title')), 2), ['Program A', 'Program B', 'Program D']));
  await check('sort=-assigned: Program Pukal (1,100) first', async () =>
    assert.match(tableRows(await programs('/dashboard/programs?year=2026&sort=-assigned'))[0], /^Program Pukal/));
  await check('month range Mar–Jun: A, B, C', async () =>
    assert.deepEqual(firstWords(tableRows(await programs('/dashboard/programs?year=2026&from=3&to=6&sort=title')), 2), ['Program A', 'Program B', 'Program C']));

  console.log('Program details → participants');
  const details = (query = '') => page(P.ProgramDetails, '/dashboard/programs/:id', `/dashboard/programs/${pA}${query}`);
  const participants = (html) => tableRows(html).filter((r) => /@test\.my/.test(r));
  const det = await details();
  await check('3 participants by name; "2 belum menilai"', () => {
    assert.deepEqual(participants(det).map((r) => r.split(' ')[0]), ["A'watif", 'Staf', 'Zainal']);
    assert.match(text(det), /3 kakitangan ditugaskan ke program ini · 2 belum menilai/);
  });
  await check('eval=pending: Staf Empat Puluh, Zainal', async () =>
    assert.deepEqual(firstWords(participants(await details('?eval=pending')), 2), ['Staf Empat', 'Zainal Bersara']));
  await check('q=zainal: one row + "Menunjukkan 1 daripada 3 peserta"', async () => {
    const html = await details('?q=zainal');
    assert.equal(participants(html).length, 1);
    assert.match(text(html), /Menunjukkan 1 daripada 3 peserta/);
  });

  console.log('Training evaluations');
  const evaluations = (url) => page(P.Evaluations, '/dashboard/evaluations', url);
  const ev = await evaluations('/dashboard/evaluations?year=2026');
  await check('6 programs; Program A response rate 33% (1 of 3)', () => {
    const rows = tableRows(ev);
    assert.equal(rows.length, 6);
    const rowA = rows.find((r) => r.startsWith('Program A'));
    assert.match(rowA, / 3 1 33% /, rowA);
    assert.match(text(ev), /Menunjukkan 6 daripada 6 program/);
  });
  await check('resp=low: A (33%) and B (0%) only', async () =>
    assert.deepEqual(firstWords(tableRows(await evaluations('/dashboard/evaluations?year=2026&resp=low&sort=rate')), 2), ['Program B', 'Program A']));
  await check('sort=-rate: Program D (100%) first; not-required programs last', async () => {
    const rows = tableRows(await evaluations('/dashboard/evaluations?year=2026&sort=-rate'));
    assert.match(rows[0], /^Program D/);
    assert.match(rows[rows.length - 1], / - /);
  });

  console.log('Annual evaluation cycle');
  const cyclePage = (query = '') =>
    page(P.AnnualEvaluationCycle, '/dashboard/annual-evaluations/:cycleId', `/dashboard/annual-evaluations/${cycle}${query}`);
  const cy = await cyclePage();
  await check("6 staff sorted by name; A'watif 98/100", () => {
    const rows = tableRows(cy);
    assert.equal(rows.length, 6);
    assert.deepEqual(rows.map((r) => r.split(' ')[0]), ["A'watif", 'Abdul', 'Pukal', 'Pukal', 'Staf', 'Staf']);
    assert.match(rows[0], /98\/100 \(98%\)/, rows[0]);
    assert.match(text(cy), /Menunjukkan 6 daripada 6 kakitangan/);
  });
  await check("status=completed: A'watif, Staf Empat Puluh", async () =>
    assert.deepEqual(tableRows(await cyclePage('?status=completed')).map((r) => r.split(' ')[0]), ["A'watif", 'Staf']));
  await check('sup=none: Staf Kosong', async () =>
    assert.deepEqual(firstWords(tableRows(await cyclePage('?sup=none')), 2), ['Staf Kosong']));
  await check("sort=-score: A'watif (98) then Staf Empat Puluh (60), no-score rows last", async () => {
    const rows = tableRows(await cyclePage('?sort=-score'));
    assert.match(rows[0], /^A'watif/);
    assert.match(rows[1], /^Staf Empat Puluh.*60\/100/, rows.slice(0, 3).join(' | '));
  });
  await check('q=isram (supervisor name) finds Aziz and a bulk staff', async () =>
    assert.deepEqual(tableRows(await cyclePage('?q=isram')).map((r) => r.split(' ')[0]).sort(), ['Abdul', 'Pukal']));

  console.log('Proposed trainings');
  const proposals = (query = '') => page(P.ProposedTrainings, '/dashboard/proposed-trainings', `/dashboard/proposed-trainings${query}`);
  const pr = await proposals();
  await check("opens on 2027 (the window's year): 2 proposals, newest first; 1,104 not yet proposed", () => {
    const rows = tableRows(pr);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /^A'watif.*Analisis Data Lanjutan/);
    assert.match(text(pr), /Belum mencadang 1104 daripada 1106 kakitangan aktif/);
    assert.match(text(pr), /Menunjukkan 2 daripada 2 cadangan/);
  });
  await check('cons=no: Aziz only', async () => {
    const rows = tableRows(await proposals('?cons=no'));
    assert.equal(rows.length, 1);
    assert.match(rows[0], /^Abdul Aziz/);
  });
  await check('view=missing&q=staf: Staf Empat Puluh, Staf Kosong (proposers not listed)', async () => {
    const html = await proposals('?view=missing&q=staf');
    assert.deepEqual(firstWords(tableRows(html), 2), ['Staf Empat', 'Staf Kosong']);
    assert.match(text(html), /Kakitangan yang belum mencadang/);
  });
  await check('year=2026: no proposals → empty state for 2026', async () =>
    assert.match(text(await proposals('?year=2026')), /Tiada cadangan untuk 2026/));

  console.log('Assign staff');
  await check('picker lists all 1,105 unassigned active users (past 1,000) + select-all-shown', async () => {
    const t = text(await page(P.ProgramAssign, '/dashboard/programs/:id/assign', `/dashboard/programs/${pA}/assign`));
    assert.match(t, /1105 kakitangan dipaparkan/);
    assert.match(t, /Pilih semua yang dipaparkan \(1105\)/);
  });

  console.log('User edit');
  const awatifId = (await row('profiles', 'email', 'awatif@test.my')).id;
  await check('status card with an "on" switch; searchable supervisor picker', async () => {
    const html = await page(P.UserEdit, '/admin/users/:id/edit', `/admin/users/${awatifId}/edit`);
    const t = text(html);
    assert.match(t, /Status akaun Aktif/);
    assert.match(html, /role="switch"[^>]*aria-checked="true"/);
    assert.match(t, /Akaun aktif/);
    assert.match(html, /role="combobox"/);
  });
}
