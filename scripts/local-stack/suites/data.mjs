// The data functions behind the screens: hours, target bands, dashboard, leaderboard, reports.
import assert from 'node:assert/strict';
import { check } from '../harness.mjs';

export default async function data({ load, row }) {
  const { fetchUsersWithTrainingHours } = await load('/src/hooks/useUsers.ts');
  const { fetchAdminDashboard } = await load('/src/hooks/useAdminDashboard.ts');
  const { fetchLeaderboard } = await load('/src/hooks/useLeaderboard.ts');
  const { fetchEmployeeDashboardStats } = await load('/src/hooks/useDashboardStats.ts');
  const reports = await load('/src/lib/reportQueries.ts');
  const { getMonthRangeBounds } = await load('/src/lib/dateUtils.ts');
  const { countsTowardTarget, isTargetMet } = await load('/src/lib/trainingTarget.ts');
  const awatifId = (await row('profiles', 'email', 'awatif@test.my')).id;
  const leaverId = (await row('profiles', 'email', 'leaver@test.my')).id;

  console.log('Users list / shared hours');
  const users2026 = await fetchUsersWithTrainingHours(2026);
  const byName = Object.fromEntries(users2026.map((u) => [u.name, u]));
  await check('all 1,108 profiles, each once (paged + ordered)', () => {
    assert.equal(users2026.length, 1108);
    assert.equal(new Set(users2026.map((u) => u.id)).size, 1108);
  });
  await check("start-date year: A'watif 33 h (cross-year program not in 2026)", () =>
    assert.equal(byName["A'watif Raidah Ermansyah"].training_hours, 33));
  await check('31 Dec 20:00 MYT in 2026, 1 Jan 00:00 MYT not: Aziz 7 h', () =>
    assert.equal(byName['Abdul Aziz Abdul Jalil'].training_hours, 7));
  await check('1,100 bulk assignments all counted (past the 1,000-row cap)', () =>
    assert.equal(users2026.filter((u) => u.name.startsWith('Pukal') && u.training_hours === 2).length, 1100));
  await check('admin flagged from the one-to-one role embed', () => {
    assert.equal(byName['Admin Ujian'].is_admin, true);
    assert.equal(byName['Staf Kosong'].is_admin, false);
  });
  await check('supervisor names resolved', () =>
    assert.equal(byName["A'watif Raidah Ermansyah"].supervisor_name, "Halimahton Sa'diah Let"));
  const target = users2026.filter(countsTowardTarget);
  await check('target staff 1,106 (active, non-admin): met 1, below 1,105, none 3', () => {
    assert.equal(target.length, 1106);
    assert.equal(target.filter((u) => isTargetMet(u.training_hours)).length, 1);
    assert.equal(target.filter((u) => !isTargetMet(u.training_hours)).length, 1105);
    assert.equal(target.filter((u) => u.training_hours === 0).length, 3);
  });
  const users2025 = await fetchUsersWithTrainingHours(2025);
  await check("2025: cross-year program counts for A'watif (7 h)", () =>
    assert.equal(users2025.find((u) => u.name.startsWith("A'watif")).training_hours, 7));
  const janJun = await fetchUsersWithTrainingHours(2026, '1', '6');
  await check("Jan–Jun 2026: A'watif 33, Aziz 4, Staf Empat Puluh 20", () => {
    const hours = Object.fromEntries(janJun.map((u) => [u.name, u.training_hours]));
    assert.equal(hours["A'watif Raidah Ermansyah"], 33);
    assert.equal(hours['Abdul Aziz Abdul Jalil'], 4);
    assert.equal(hours['Staf Empat Puluh'], 20);
  });

  console.log('Admin dashboard');
  const dash = await fetchAdminDashboard(2026);
  await check('below-40 tile: 1,105 of 1,106', () => {
    assert.equal(dash.targetStaffCount, 1106);
    assert.equal(dash.belowTargetCount, 1105);
  });
  await check('leaderboard: top 3 correct, leaver (20 h) and admin left out', () => {
    assert.deepEqual(
      dash.leaderboard.slice(0, 3).map((e) => [e.name, e.hoursCompleted]),
      [['Staf Empat Puluh', 40], ["A'watif Raidah Ermansyah", 33], ['Abdul Aziz Abdul Jalil', 7]]
    );
    assert.ok(!dash.leaderboard.some((e) => e.name === 'Zainal Bersara' || e.name === 'Admin Ujian'));
  });
  await check('2026 participations 1,108 and hours 2,304 (start-date year)', () => {
    assert.equal(dash.totalParticipants, 1108);
    assert.equal(dash.totalHours, 2304);
  });
  await check('2026 programs: 6 start in 2026 (cross-year and 1 Jan excluded)', () => assert.equal(dash.totalPrograms, 6));
  await check('monthly trend: Dec has the 31 Dec program (3 h), Jan has nothing', () => {
    assert.equal(dash.monthlyTrend.find((m) => m.monthNum === 12).hours, 3);
    assert.equal(dash.monthlyTrend.find((m) => m.monthNum === 1).hours, 0);
  });

  console.log('Staff leaderboard + staff dashboard');
  const board = await fetchLeaderboard(awatifId, 2026);
  await check("A'watif ranked 2nd; leaver not ranked", () => {
    assert.equal(board.topTen[1].name, "A'watif Raidah Ermansyah");
    assert.equal(board.topTen[1].isCurrentUser, true);
    assert.ok(!board.topTen.some((e) => e.name === 'Zainal Bersara'));
  });
  const leaverBoard = await fetchLeaderboard(leaverId, 2026);
  await check('a leaver viewing the board has no entry', () => assert.equal(leaverBoard.currentUserEntry, null));
  const stats = await fetchEmployeeDashboardStats(awatifId, 2026);
  await check("A'watif 2026: 33 h, 83%; pending = Program B only (A evaluated, cross-year is 2025)", () => {
    assert.equal(stats.hoursThisYear, 33);
    assert.equal(stats.compliancePercentage, 83);
    assert.deepEqual(stats.pendingEvaluations.map((a) => a.programs.title), ['Program B']);
  });
  const stats2025 = await fetchEmployeeDashboardStats(awatifId, 2025);
  await check("A'watif 2025: 7 h, cross-year program pending in 2025", () => {
    assert.equal(stats2025.hoursThisYear, 7);
    assert.deepEqual(stats2025.pendingEvaluations.map((a) => a.programs.title), ['Program Rentas Tahun']);
  });

  console.log('Reports');
  const summary = await reports.generateStaffHoursSummary(2026, '', '');
  await check('summary: 1,106 rows incl. 0 h staff; no admin, no leaver', () => {
    assert.equal(summary.length, 1106);
    assert.ok(summary.some((r) => r.name === 'Staf Kosong' && r.hours === 0 && r.target_status === 'below'));
    assert.ok(!summary.some((r) => r.name === 'Admin Ujian' || r.name === 'Zainal Bersara'));
    const forty = summary.find((r) => r.name === 'Staf Empat Puluh');
    assert.equal(forty.target_status, 'met');
    assert.equal(forty.target_percent, 100);
    assert.equal(summary.find((r) => r.name.startsWith("A'watif")).target_percent, 83);
  });
  const { start, end } = getMonthRangeBounds(2026, 1, 2026, 12);
  const perTraining = await reports.generateTrainingHoursByUser(start, end);
  await check('hours by user: 1,108 rows, sum 2,304 h', () => {
    assert.equal(perTraining.length, 1108);
    assert.equal(perTraining.reduce((s, r) => s + r.hours, 0), 2304);
  });
  await check('evaluation column: done / pending / not required', () => {
    const aw = perTraining.filter((r) => r.name.startsWith("A'watif"));
    assert.equal(aw.find((r) => r.program === 'Program A').evaluation, 'done');
    assert.equal(aw.find((r) => r.program === 'Program B').evaluation, 'pending');
    assert.equal(perTraining.find((r) => r.name.startsWith('Abdul Aziz') && r.program === 'Program C').evaluation, 'not_required');
  });
  const programList = await reports.generateProgramList(start, end);
  await check('program list: 6 programs, Program Pukal 1,100 participants, 2,200 total h', () => {
    assert.equal(programList.length, 6);
    const bulk = programList.find((r) => r.title === 'Program Pukal');
    assert.equal(bulk.participants, 1100);
    assert.equal(bulk.total_hours, 2200);
  });
  const overseas = await reports.generateProgramOverseas(2026, 2026);
  await check('overseas 2026: only Program D (Staf Empat Puluh, Tokyo)', () => {
    assert.deepEqual(overseas.map((r) => [r.name, r.program, r.location]), [['Staf Empat Puluh', 'Program D', 'Tokyo']]);
  });
}
