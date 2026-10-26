-- Fake data with known answers (no real staff). id = md5(key)::uuid
create function pg_temp.u(k text) returns uuid language sql immutable as $$ select md5(k)::uuid $$;

insert into public.profiles (id, name, email, position, status, supervisor_id) values
  (pg_temp.u('sup1'),   'Halimahton Sa''diah Let', 'sup1@test.my', 'Pengarah', 'active', null),
  (pg_temp.u('sup2'),   'Isram Azhar', 'sup2@test.my', 'Pengurus', 'active', null),
  (pg_temp.u('admin'),  'Admin Ujian', 'admin@test.my', 'Pentadbir', 'active', null),
  (pg_temp.u('awatif'), 'A''watif Raidah Ermansyah', 'awatif@test.my', 'Pegawai', 'active', pg_temp.u('sup1')),
  (pg_temp.u('aziz'),   'Abdul Aziz Abdul Jalil', 'aziz@test.my', 'Pegawai', 'active', pg_temp.u('sup2')),
  (pg_temp.u('forty'),  'Staf Empat Puluh', 'forty@test.my', 'Pegawai', 'active', pg_temp.u('sup1')),
  (pg_temp.u('zero'),   'Staf Kosong', 'zero@test.my', 'Pegawai', 'active', null),
  (pg_temp.u('leaver'), 'Zainal Bersara', 'leaver@test.my', 'Pegawai', 'inactive', pg_temp.u('sup2'));
insert into public.profiles (id, name, email, status, supervisor_id)
  select pg_temp.u('bulk' || g), 'Pukal ' || lpad(g::text, 4, '0'), 'bulk' || g || '@test.my', 'active', pg_temp.u('sup1')
  from generate_series(1, 1100) g;

insert into public.user_roles (user_id, role)
  select id, (case when id = pg_temp.u('admin') then 'admin' else 'employee' end)::public.app_role from public.profiles;

insert into public.programs (id, title, hours, start_date_time, end_date_time, notify_for_evaluation, training_type, location) values
  (pg_temp.u('pA'), 'Program A', 20, '2026-03-10 09:00+08', '2026-03-12 17:00+08', true,  'Local', 'KL'),
  (pg_temp.u('pB'), 'Program B', 13, '2026-05-05 09:00+08', '2026-05-06 17:00+08', true,  'Local', 'KL'),
  (pg_temp.u('pC'), 'Program C', 4,  '2026-06-01 09:00+08', '2026-06-01 13:00+08', false, 'Local', 'KL'),
  (pg_temp.u('pD'), 'Program D', 20, '2026-08-01 09:00+08', '2026-08-03 17:00+08', true,  'International', 'Tokyo'),
  -- starts 2025, ends 2026: counts in 2025
  (pg_temp.u('pX'), 'Program Rentas Tahun', 7, '2025-12-30 09:00+08', '2026-01-02 17:00+08', true, 'Local', 'KL'),
  -- 31 Dec 20:00 MYT = 12:00 UTC: still 2026
  (pg_temp.u('pE'), 'Program 31 Dis', 3, '2026-12-31 20:00+08', '2026-12-31 22:00+08', false, 'Local', 'KL'),
  -- 1 Jan 00:00 MYT: 2027
  (pg_temp.u('pF'), 'Program 1 Jan', 5, '2027-01-01 00:00+08', '2027-01-01 05:00+08', false, 'Local', 'KL'),
  (pg_temp.u('pG'), 'Program Pukal', 2, '2026-02-02 09:00+08', '2026-02-02 11:00+08', false, 'Local', 'KL');

insert into public.program_assignments (user_id, program_id, status) values
  (pg_temp.u('awatif'), pg_temp.u('pA'), 'Assigned'),
  (pg_temp.u('awatif'), pg_temp.u('pB'), 'Assigned'),
  (pg_temp.u('awatif'), pg_temp.u('pX'), 'Assigned'),
  (pg_temp.u('aziz'),   pg_temp.u('pC'), 'Assigned'),
  (pg_temp.u('aziz'),   pg_temp.u('pE'), 'Assigned'),
  (pg_temp.u('aziz'),   pg_temp.u('pF'), 'Assigned'),
  (pg_temp.u('forty'),  pg_temp.u('pA'), 'Assigned'),
  (pg_temp.u('forty'),  pg_temp.u('pD'), 'Assigned'),
  (pg_temp.u('leaver'), pg_temp.u('pA'), 'Assigned'),
  (pg_temp.u('admin'),  pg_temp.u('pC'), 'Assigned');
insert into public.program_assignments (user_id, program_id, status)
  select pg_temp.u('bulk' || g), pg_temp.u('pG'), 'Assigned' from generate_series(1, 1100) g;

insert into public.evaluations (user_id, program_id, answers) values
  (pg_temp.u('awatif'), pg_temp.u('pA'), '{"q1": 3}');

-- Proposal window Dec 2026 – Feb 2027 -> proposals count for 2027
insert into public.system_settings (key, value) values
  ('proposal_period', '{"start_date": "2026-12-01", "end_date": "2027-02-28", "mode": "auto"}');
insert into public.proposed_trainings (user_id, year, training_title, training_details, notes, is_entertained, created_at) values
  (pg_temp.u('awatif'), 2027, 'Analisis Data Lanjutan', 'Kursus Python untuk analisis', null, true,  '2026-12-05 10:00+08'),
  (pg_temp.u('aziz'),   2027, 'Pengurusan Projek',      'PMP asas',                    'Jika ada', false, '2026-12-03 10:00+08');
-- Annual cycle 2026 for six staff
insert into public.annual_evaluation_cycles (id, year, start_date, end_date) values
  (pg_temp.u('cycle2026'), 2026, '2026-10-01', '2026-12-31');
insert into public.annual_evaluations (cycle_id, user_id, supervisor_id, status, staff_answers, supervisor_answers, staff_submitted_at, supervisor_submitted_at) values
  (pg_temp.u('cycle2026'), pg_temp.u('awatif'), pg_temp.u('sup1'), 'completed',
     '{"q1":4,"q2":4,"q3":4,"q4":4,"q5":4,"q6":4,"q7":4,"q8":4,"q9":4,"q10":4}',
     '{"q1":5,"q2":5,"q3":5,"q4":5,"q5":5,"q6":5,"q7":5,"q8":5,"q9":5,"q10":4}', '2026-10-05 09:00+08', '2026-10-10 09:00+08'),
  (pg_temp.u('cycle2026'), pg_temp.u('forty'), pg_temp.u('sup1'), 'completed',
     '{"q1":3,"q2":3,"q3":3,"q4":3,"q5":3,"q6":3,"q7":3,"q8":3,"q9":3,"q10":3}',
     '{"q1":3,"q2":3,"q3":3,"q4":3,"q5":3,"q6":3,"q7":3,"q8":3,"q9":3,"q10":3}', '2026-10-06 09:00+08', '2026-10-11 09:00+08'),
  (pg_temp.u('cycle2026'), pg_temp.u('aziz'), pg_temp.u('sup2'), 'pending_supervisor',
     '{"q1":4,"q2":4,"q3":4,"q4":4,"q5":4,"q6":4,"q7":4,"q8":4,"q9":4,"q10":4}', null, '2026-10-07 09:00+08', null),
  (pg_temp.u('cycle2026'), pg_temp.u('zero'), null, 'pending_staff', null, null, null, null),
  (pg_temp.u('cycle2026'), pg_temp.u('bulk1'), pg_temp.u('sup1'), 'pending_staff', null, null, null, null),
  (pg_temp.u('cycle2026'), pg_temp.u('bulk2'), pg_temp.u('sup2'), 'pending_staff', null, null, null, null);
-- More evaluations so the response rate varies: Program B 0 of 1 (0%), Program D 1 of 1, Program A 1 of 3
insert into public.evaluations (user_id, program_id, answers) values
  (pg_temp.u('forty'), pg_temp.u('pD'), '{"q1": 3}');
