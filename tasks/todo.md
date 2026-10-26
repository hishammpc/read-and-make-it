# Project sweep — 2026-09-28

Baseline: `npm run build` ✅ (4m27s, one 1.93 MB chunk) · `tsc --noEmit` ❌ 126 errors / 18 files · `npm run lint` ❌ 169 errors.
Vite doesn't typecheck, so all of these ship.

## A. Security — no real boundary today (needs a decision, see D4)

- [ ] **A1 RLS off + anon key in bundle** → anyone can read/write every table (staff PII, all annual-eval scores) and PATCH their own `user_roles` to admin. `migrations/20260202100000_disable_rls_for_hybrid_auth.sql`; `system_settings` never had RLS.
- [ ] **A2 Admin via email only** — `/auth` email login stores `role:'admin'` for admin emails, no password (`lib/emailOnlyAuth.ts:67`). `/admin/login` isn't linked anywhere. Admins created in UI have no `auth.users` row (`hooks/useUsers.ts:148-169`) so email-only is their *only* way in → can't just block it without a migration path.
- [ ] **A3 Forgeable session** — localStorage `mylearning_user_session` trusted as-is, never re-checked, no expiry (`contexts/AuthContext.tsx:28-36`). Deactivated users stay logged in.
- [x] **A4 No role check on admin routes** — `ProtectedRoute requireAdmin` exists, never used (`App.tsx`). Only gate is PIN `101010` (`AdminLayout.tsx:22`), which is in the bundle + CLAUDE.md + docs. Header Sign Out doesn't clear `adminPinVerified`.
- [x] **A5 IDOR on annual evals** — `SupervisorEvaluationForm.tsx:29-55` never checks `supervisor_id === me`; update is by `id` only (`useAnnualEvaluations.ts:367-376`). Staff can grade themselves via `/dashboard/supervisee-evaluations/<cycle>/<ownId>` → `completed`. History/detail pages load any eval by id.
- [ ] **A6 `.env` tracked in git** despite `.gitignore` (since 8c0e45d, GitHub remote). `git rm --cached .env`; rotate anything that isn't the anon key.
- [x] **A7 `ilike` login** — `_` is a wildcard; `_____@domain` logs in as a unique match. Use `.eq` on lowercased email (`emailOnlyAuth.ts:47,224`).
- [x] A8 Logout doesn't `supabase.auth.signOut()` — admin JWT stays in localStorage.
- [ ] A9 Public test routes `/certificate-test`, `/annual-evaluation-test`, `/preview/evaluation` (client-only, harmless) → remove.

## B. Broken features (clear-cut)

- [x] **B1 Attendance + certificate upload dead since 13 Nov 2025** (978a05b) — use `user?.id` but `UserSession` has `userId`. Save → "User not authenticated"; Mark-all → no-op; upload → "fill in all fields". `Attendance.tsx:64,82,103,128`, `pages/admin/CertificateUpload.tsx:74,95`, `components/certificates/CertificateUpload.tsx:48,74`. Neither page is in the sidebar. No-Show can't be recorded.
- [x] **B2 Admin "Overdue Evaluations" panel never shows** — `profiles!inner` is ambiguous (2 FKs to profiles) → PGRST201, error ignored; `.limit(10)` before filtering; N+1; only `Attended` rows (see B1). `useAdminDashboard.ts:256-282`.
- [x] **B3 Evaluations page truncates at 1000 rows** — `useEvaluationsByProgram` missed by the 41c2b32 pagination fix (`useEvaluations.ts:314-317`).
- [x] **B4 "Staff Evaluation" menu shown to every employee** — `pendingSuperviseeCount >= 0` always true (`EmployeeLayout.tsx:46`).
- [x] **B5 Status transitions unguarded** — staff/supervisor submits don't `.eq('status', expected)`; stale tab turns `completed` back into `pending_supervisor` (`useAnnualEvaluations.ts:274-283, 367-376`). Reset offers all 3 types regardless of status → invalid states (`AnnualEvaluationCycle.tsx:456-464`, hook L552).
- [x] **B6 Dec 31 dropped from year totals** — `lte(ts,'YYYY-12-31')` = 08:00 MYT (`useAdminDashboard.ts:74,90,106,116`, `useLeaderboard.ts:28,48`); string compare in `useDashboardStats.ts:167,189,217,232`. UsersList uses `T23:59:59` → screens disagree. Use half-open `[Y-01-01+08, Y+1-01-01+08)`.
- [ ] **B7 Bulk import duplicates profiles → user locked out** — existing-email check is case-sensitive (`useBulkImport.ts:42-46`), no in-file dedupe, no unique index; login `.maybeSingle()` errors on 2 rows. Missing JAWATAN column wipes positions (L119-122). Role insert failure swallowed but counted "created".
- [x] **B8 Proposed Trainings "Entertained" card always 0** — counts `is_entertained`, toggle writes `proposal_1/2_entertained` (`ProposedTrainings.tsx:124`).
- [ ] **B9 Closing a cycle doesn't stop submissions** — no cycle status/date check in any submit path or pending list. "Tutup Kitaran" is one click, no confirm, no reopen (`AnnualEvaluationCycle.tsx:236`).
- [ ] B10 Evaluation allowed for No-Show / unassigned / future programs; certificate unlocks on evaluation alone (`EvaluationForm.tsx:84-125`, `MyTrainings.tsx:288-319`). Depends on D2.
- [x] B11 MyEvaluations completed tab shows category "N/A" always — `category` not selected (`useEvaluations.ts:217`).
- [x] B12 Partial failures reported as success — role delete/insert (`useUsers.ts:236-246`), supervisor change on annual evals (`useSupervisors.ts:117-120`).
- [x] B13 CSV exports: formula injection (`= + - @` from employee text) + no BOM for Excel (`ProposedTrainings.tsx:145`, `lib/csvUtils.ts:36-48`).
- [ ] B14 Cycle creation not atomic — cycle insert then evals insert; failure leaves empty cycle and UNIQUE(year) blocks retry (`useAnnualEvaluations.ts:133-167`).
- [ ] B15 Stale cache: new cycle doesn't refresh `annual-evaluation-stats`; `['users']` invalidations miss `users-with-training-hours`; evaluation submit doesn't refresh dashboards.
- [ ] B16 Small: ProgramAssign lets you select already-assigned users → whole batch fails on UNIQUE; create-cycle year defaults to an existing year; no from ≤ to validation on date ranges; unassign leaves the evaluation counted; Reports PDF header reads live filters.

## C. Structural / hygiene

- [x] **C1 `types.ts` stale** — missing `annual_evaluation_cycles`, `annual_evaluations`, `proposed_trainings`, `bulk_uploads`; columns `profiles.supervisor_id`, `programs.notify_for_evaluation`, `programs.training_type`. Cause of most of the 126 tsc errors. Regenerate, then add `tsc --noEmit` to `build`.
- [x] **C2 Migrations can't rebuild prod** — `programs.category NOT NULL` but ProgramForm never sends it; `proposal_1/2_entertained`, `entertained_proposal` exist in no migration. Prod was edited by hand. `supabase db pull` → commit reconciling migration. `config.toml` project_id is a placeholder.
- [x] C3 `profiles.email` no unique index; `user_roles` allows 2 roles/user (`loginAdmin` `.single()` fails on 2).
- [ ] C4 Deleting a program cascades assignments/evaluations/certificates → wipes hours history. Archive instead.
- [ ] C5 `fetchAllRows` callers have no `.order()` → rows can dup/skip across pages.
- [ ] C6 Dead code: `lib/calculations.ts`, `pages/Index.tsx`, `components/NavLink.tsx`, `components/certificates/CertificateUpload.tsx`, `EvaluationQuestionRenderer.tsx`, dead feedback dialog in `Evaluations.tsx:392-440`, never-opened `ProposedTrainingDialog` in EmployeeLayout that still runs queries on every page; template pages routed but unlinked.
- [ ] C7 1.93 MB single chunk → lazy-load routes. No security headers in `netlify.toml`.
- [ ] C8 CLAUDE.md drift — "admins use password" not true; `isProposalPeriodOpen()`/`calculations.ts` documented but unused; page/hook counts wrong. Also PIN is in it.
- [ ] C9 docs/ contain real staff names + `@mpc.gov.my` emails; `IMPLEMENTATION_BRIEF.md:494` suggests a `VITE_SUPABASE_SERVICE_ROLE_KEY` (would ship to browser).

## D. Decisions needed from Hazman

- **D1 Compliance maths** — hours count every assignment incl. No-Show and future (deliberate since 49fbcd4). Org/department target = `uniqueParticipants × 40`, so staff with 0 hours are excluded → compliance inflated (297 staff, 200 trained ⇒ target 8,000h not 11,880h). Keep or change?
- **D2 Evaluation eligibility** — require `Attended` + program ended before evaluating / certificate? Enforce the 3-day window or keep it admin-only?
- **D3 Attendance** — how is it marked today? Fix the page + add to nav, or drop the feature?
- **D4 Auth model** — only real fix for A1–A3: employees get a Supabase session (email OTP / magic link), admins get real passwords, RLS back on with policies. Interim: move writes to RPCs, revoke anon on sensitive tables.

## Plan

1. **Batch 1 (no decisions needed):** B1 (fix `userId` only), B2, B3, B4, B5, B6, B8, B11, B12, B13, A4 (`requireAdmin` + clear PIN flag on sign-out), A5 (ownership check in supervisor form + `.eq` guards), A7, A9, A6 (untrack `.env`). Verify: build + tsc error count drops + targeted checks.
2. **Batch 2:** C1 regenerate types (needs Supabase access) + tsc in build; C2 schema reconcile; C3 unique indexes (check prod for existing dupes first).
3. **Batch 3 after D1–D4:** B7, B9, B10, B14, auth rework.

## Review — Batch 1 (2026-09-28)

**Done (24 files, uncommitted):**
- B1 `user.id` → `user.userId` in Attendance + both certificate uploaders. Pages still not in the sidebar (D3).
- B2 overdue panel: `profiles:user_id` hint, fetch-all then filter (no pre-limit), scoped to selected year + `notify_for_evaluation`, N+1 removed.
- B3 `useEvaluationsByProgram` evaluations paginated via `fetchAllRows` + `.order('id')`.
- B4 menu gated on new `useIsSupervisor` (any `annual_evaluations.supervisor_id = me`).
- B5 staff submit guarded `.eq(user_id).eq(status,'pending_staff')`; supervisor submit `.eq(supervisor_id).eq(status,'pending_supervisor')`; reset offers only valid types per status and the hook guards partial resets on status.
- B6 new `getYearBounds` / `getMonthRangeBounds` / `isWithinBounds` in `lib/dateUtils.ts` (half-open, local time). Applied to admin dashboard, leaderboard, employee dashboard, `useUsersWithTrainingHours`, `useEvaluationsByProgram`, Reports (all 3 generators).
- B8 Entertained = submissions with proposal 1 or 2 entertained.
- B11 `category` selected in `useUserEvaluations`.
- B12 bulk-import role failure now reported per row (not counted "created"); supervisor change surfaces the annual-eval update error. (`useUpdateUserRole` is dead code → C6.)
- B13 shared `escapeCSVValue` neutralises `= + - @ \t \r` on strings, quotes `\r`; BOM added to `downloadCSV`; ProposedTrainings export reuses it.
- A4 `requireAdmin` on all 20 AdminLayout routes; role resolved as admin if *any* `user_roles` row is admin (fixes `[0]` ordering in email login and `.single()` failure in `loginAdmin` for 2-role users).
- A5 supervisor form query scoped to `supervisor_id = me`; history/detail pages show "not found" to non-owners.
- A7 ilike wildcards (`\ % _ *`) escaped; still case-insensitive.
- A8 `logout()` clears `adminPinVerified` and `supabase.auth.signOut({ scope: 'local' })`.

**Verified:** `npm run build` ✅. `tsc` 126 → 121; the 8 `UserSession.id` errors are gone; the 3 new ones are the stale-types class (queries on `annual_evaluations`, missing from `types.ts`) → C1. Lint unchanged (169). Helper assertions (`scratchpad/helpers.test.mts`, TZ=Asia/Kuala_Lumpur) pass: 31 Dec 17:00 MYT now counts in its year, 1 Jan 00:00 MYT doesn't; CSV formula cells neutralised, numbers untouched; `_____@x` pattern escaped.

**Not verified (needs a live click-through — can't hit the API from here):** overdue panel renders rows; supervisor form shows "not found" for a non-supervisor; stale-tab submit is rejected; attendance save + certificate upload succeed (upload also depends on the `certificates` bucket being public — code uses `getPublicUrl`).

**Held back, need Hazman:**
- A6 untrack `.env` — client reads `VITE_SUPABASE_*` with no fallback; if Netlify env vars aren't set, removing it breaks the next deploy. Confirm Netlify → Site settings → Environment variables first.
- A9 test routes — block is commented "Preview routes - no auth required" and CertificateTest was edited in bf50755 (15 Jul); looks like a deliberate no-login preview. No DB access, so no security gain from gating. Keep or gate behind `import.meta.env.DEV`?

---

# UI/UX modernisation — plan (2026-09-28)

## Diagnosis (from code audit; not yet seen rendered)
- **Brand mismatch** — app uses a fully saturated generic blue (`--primary: 211 100% 50%`); MPC's identity is black + red. No font loaded (system font). `index.html` still "read-and-make-it" + Lovable meta, `lang="en"`; Vite boilerplate `App.css` unused.
- **Dark mode is broken for some users today** — ThemeProvider defaults to `system`, toggle is commented out, so OS-dark staff get dark mode with no way out; 130+ `bg-*-50/100` and 110+ `text-*-700+` have no `dark:` variant, radar labels hardcoded `#000`, dark cards are darker than the page.
- **No status tokens** — ~730 raw palette classes; the same annual-eval status has 3 different colour mappings (pending_staff = yellow / grey / orange); 5-level rating colours copied 7×; Attended shown blue.
- **Duplication** — both layouts re-implement the whole shell (nav markup ×4); stat card copied 27× (+4 variants); radar chart copied 5×; 6 page-header patterns, 2 back icons, duplicate h1s.
- **States** — 4 loading patterns (skeleton / CSS spinner "Loading…" / Loader2), 4 empty-state patterns, 2 toast systems mounted, 4 `alert()` calls.
- **Language** — nav + admin + training pages English; annual-eval pages Malay; mixed inside single pages ("Muat Turun PDF" next to "Download"; "Entertained" next to "Muat Turun CSV").
- **A11y** — 44 icon-only buttons, 0 aria-labels; ~11 clickable divs/rows/cards without keyboard support; rating buttons without focus ring; 20 labels without `htmlFor`.
- **Responsive** — admin headers/filter bars don't stack; two fixed 3-col grids.
- **Type** — heavy (124 bold vs 58 semibold), no `tabular-nums` on any number.

## Direction
"MPC ink & red": near-black ink for primary actions, MPC red used sparingly (brand mark, active-nav marker, key highlight), cool neutral greys, proper semantic tokens (success / warning / info / danger). Plus Jakarta Sans (SEA-designed geometric sans, pairs with the MPC wordmark), tabular numbers. Calm, dense-but-breathing internal-tool look — no grain, parallax, glass or stock imagery (wrong for a government LMS).

## Phases (verify each: build + tsc + Hazman eyeballs on dev server)
- [x] **P1 Foundation (global, low risk)** — font; colour tokens + status tokens in `index.css`/tailwind; light by default (dark off until P5); `index.html` title/meta/`lang="ms"`; delete `App.css`; button/card/input polish (transitions, press feedback, focus rings, radius scale); `tabular-nums` utility.
- [x] **P2 Shell** — one shared `AppShell` for Admin + Employee layouts (grouped nav, red active marker, user menu with sign-out, `<Link>` logo, mobile drawer); login, admin login and PIN screens redesigned.
- [x] **P3 Shared components** — `PageHeader`, `StatCard`, `StatusBadge` (single source for every status → colour/label), `EmptyState`, `LoadingState`; roll out dashboards first, then lists, then forms. Replace `alert()`.
- [x] **P4 Charts + a11y** — one `RadarScoreChart` on theme tokens (load dataviz skill first); progress/compliance colours from tokens; aria-labels, keyboard-accessible rows/cards, label `htmlFor`, mobile-stacking headers/filters.
- [ ] **P5 (optional)** — language standardisation pass; re-enable dark mode properly with a visible toggle.

## Decisions (Hazman, 2026-09-28)
- Brand: **not MPC** → refined, calmer blue on cool neutral greys (keeps continuity).
- Font: Plus Jakarta Sans, self-hosted (no objection).
- Language: **dual BM/EN, BM default**, switch in header. Official content (evaluation questions, PDFs, certificates, CSV exports) stays BM.
- Dark mode: **wanted** → proper tokens + Light/Dark/System switch. Default light until every page is converted, then consider System.

Phase changes: i18n infrastructure + switch lands in P2 (shell); pages are translated as they are restyled in P3/P4. P5 = flip default to System once all pages are dark-safe.

## Review — UI phase 3 (2026-09-28)
- Shared `components/common/*` + `lib/status.ts` + per-area `i18n/sections/*`; ProgramsList converted as the reference, then 4 parallel passes (dashboards, admin training, admin staff/annual/reports, staff pages). ~45 files; every page on PageHeader / StatCard / StatusBadge / EmptyState / PageSkeleton / ErrorState and translated BM/EN.
- Raw palette classes ~730 → only intentional ones (auth panel, dark-mode logo chip), the unused `components/certificates/CertificateUpload.tsx`, and the 5 Recharts charts (P4).
- `alert()` → toasts; "Tutup kitaran" now confirms; admin dashboard/leaderboard/staff dashboard keep previous year on screen while a new year loads; Badge renders `<span>`.
- **Bugs fixed on the way:** admin evaluation summary still used the retired 9-question form (q6 is now a text comment; divided by 9 → capped ~1.67/3) — now q1–q5 with current labels and a pooled overall; UsersList sorted the React Query cache in place; create-cycle rejection unhandled; template create/edit `<SelectItem value="">` (Radix throws → page crash); template builder remove buttons submitted the form.
- **Verified:** build ✅, tsc 121 → 112 (all remaining = stale types / pre-existing), lint errors 169 → 159, all 56 changed modules compile in dev. Not seen rendered by me.
- **Noticed, left for later:** N success toasts when uploading one certificate to N staff (hook); "Upload another" doesn't reset the file input; EvaluationForm program query `.single()` retries 3× before "not found"; MyAnnualEvaluation shows only a header when a closed cycle is still `pending_staff`; hook toasts (useUsers, useAnnualEvaluations, useBulkImport…) still English/BM-only; `useUserSupervisor` fetched but unused on staff dashboard; BulkUserImport not linked anywhere.

## P4 scope additions
- One `RadarScoreChart` (4 copies) + ProgramDetails chart on tokens (load dataviz skill first); tooltip `bg-white`.
- Promote local copies to shared: `ScoreCard` (3 files), `Callout` / notice banner (dashboard, MyAnnualEvaluation, Attendance, CertificateUpload), 5-level rating option (2 files); StatCard `active`/`aria-pressed` for filter toggles; `t.common.unknown`.
- Delete unused `@keyframes pulse-glow`, `components/certificates/CertificateUpload.tsx`, `lib/calculations.ts`.
- Translate hook toasts.

## Review — UI phase 4 (2026-09-28)
- **Charts** (dataviz skill): one `charts/RadarScoreChart` replaces 4 copied radars + the ProgramDetails radar (kept as radar — client feature). Series = categorical slots on new `--chart-1/2` tokens (blue + orange; validator PASS both modes vs card surfaces, CVD ΔE 28.9 light / 27.7 dark); status green no longer used as a series. Solid hairline grid, muted ticks, 8px points with surface ring, legend for 2 series, themed `ChartTooltipBox`. Admin line chart: no dashed grid, no single-series legend, themed tooltip. StatCard values dropped `tabular-nums` (anti-pattern on large standalone numbers).
- **Shared components**: `Callout` (tinted/plain) + `Notice`, `ScoreCard`, `LevelRadioGroup`; StatCard `active` (tone ring + aria-pressed); `toneClasses[t].ring`. Replaced 3 ScoreCard copies, 2 Callouts, 2 banners, 2 rating pickers.
- **Toasts** in 10 hooks translated (`t.toasts`, `t.common.success/errorTitle`), incl. thrown messages; bulk import uses a `NoValidUsersError` class. Certificate upload hook no longer toasts per staff member (page shows one summary).
- **Fixes**: evaluation form program query `maybeSingle` + ErrorState (no 3× retry before "not found"); "Upload another" remounts the file input; staff dashboard shows the supervisor's name under "check your supervisor's name".
- **Deleted**: `components/certificates/CertificateUpload.tsx`, `lib/calculations.ts`, `pages/Index.tsx`, `components/NavLink.tsx`, `EvaluationQuestionRenderer.tsx`, `useUpdateUserRole`, `isProposalPeriodOpen`, `useAdminDashboardStats`, `@keyframes pulse-glow`, dead Evaluations feedback dialog. Kept `useDeactivateUser` (needed for a missing "deactivate leaver" feature).
- **Verified**: build ✅, tsc 112 (per-file identical), lint errors 159 → 148, 39 changed modules compile in dev, component-swap check vs HEAD clean. Not seen rendered by me.
- **Not done / by design**: MyAnnualEvaluation "closed cycle, pending_staff" empty page can't occur with the current pending query (it includes every cycle) — handle together with B9. Test/preview pages still have hex colours (A9 pending).

---

# Where we stopped — 2026-09-28

**State:** 5 commits on local `main`, NOT pushed (`a3c9bcd` Batch 1 → `f807576` UI phase 4). Pushing = one Netlify deploy.

**Paused because:** the database belongs to MPC (project `ecoxrleadphtiaoxaswl`), not Hazman. Meeting them to request access.
- Ask for: an invite of Hazman's Supabase account to their org with the **Developer** role (no secrets exchanged; revocable). Fallbacks: personal access token (broad) or DB password (CLI only). Never the `service_role` key; never paste tokens into chat.

**Before pushing (5 min, read-only, on `npm run dev` — the local dev server already talks to the live DB):**
1. Admin dashboard loads; overdue panel shows or is empty (browser console must not show "Overdue evaluations query failed").
2. Log out/in as a staff email containing `_` or `.`, and as an admin.
3. Training Evaluations page shows response counts; annual result pages show radar + score cards.
Writes (attendance, certificate upload, submissions) only on a test program/account.

**Tell MPC after the push:** UI defaults to BM (EN switch in the top bar); admins with an old saved login may need to log out/in once.

**Next, in order:**
1. Push (after the checks above).
2. Batch 2 once access exists: regenerate `types.ts` + `tsc --noEmit` in build (C1); catch-up migration from the live schema (C2); unique `lower(email)` + one-role-per-user after a read-only duplicate check (C3 — writes to prod, needs Hazman's OK on the SQL).
3. UI phase 5: theme default → System (every page is dark-safe now; test/preview pages excepted).
4. Open questions for Hazman: A6 (are `VITE_SUPABASE_*` set in Netlify env? then untrack `.env`), A9 (keep the no-login `/certificate-test`, `/annual-evaluation-test`, `/preview/evaluation`?), decisions D1–D4 (compliance maths, evaluation eligibility, attendance flow, email-OTP + RLS).

## Session 2026-10-23 — DB access from MPC
- Access: MPC access token in `.env.local` (gitignored; token sees only MYLEARNINGPRO) + DB URL. Direct host is IPv6-only → helper scripts use the session pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`. Read-only checks run in `BEGIN TRANSACTION READ ONLY`.
- **C1 done (uncommitted):** `types.ts` regenerated from prod → tsc 112 → 0; remaining 4 were type-only (column-hinted embeds supabase-js can't infer; wrong `useUserAssignments` type; ProgramEdit `training_type` narrowing). `npm run build` now runs `tsc --noEmit` first; `npm run typecheck` added.
- **C3 applied to prod:** `supabase/migrations/20261023035322_unique_email_single_role.sql` — unique `lower(email)` on profiles, `UNIQUE(user_id)` on user_roles. Pre-checked: 0 duplicate emails, 1 role per user. Verified live after commit.
- **Live findings:** RLS off on 12/13 tables (only `bulk_uploads` on); **attendance never recorded** (3,379 assignments all `Assigned`) → overdue panel always empty until D3 is decided; **Auth sign-up open + autoconfirm** + `handle_new_user` trigger → anyone with the public anon key can create a staff profile → MPC to switch off "Allow new users to sign up"; certificates bucket private with 0 files, code uses `getPublicUrl` → links will break once used (switch to signed URLs); no `supabase_migrations` history (all SQL was applied by hand); 3 staff emails contain `_` (login escaping verified for all 3).
- **Follow-ups from C3:** bulk import with the same email twice in one CSV now fails that batch with a duplicate-key error (B7: dedupe in-file + friendly message); creating a user with an existing email shows a raw duplicate-key toast (map to a friendly message).
- **Still to do:** C2 catch-up migration (needs Docker Desktop running for a full schema dump); push; D1–D4 answers from MPC.
- **D3 decided (2026-10-23): no attendance in the system** — MPC records attendance manually. Attendance page stays as is (URL-only, not in menu). Consequence: the admin "Overdue Evaluations" panel (counts only `Attended`) stays empty unless it's later changed to count everyone assigned.
- Auth sign-up switched off by MPC (verified `disable_signup: true`).

---

# Program evaluation v2 — before/after improvement (MPC / Ketua Pengarah, 2026-10-23)

**Decisions (Hazman):** programs **starting on/after 1 Jan 2027** use the new form; keep the optional comment box; improvement = average (after − before) per question and overall, plus each staff member's own difference, plus a master chart.

**Form v2 (official BM, 1–5: Sangat rendah, Rendah, Sederhana, Tinggi, Sangat tinggi; each rated Sebelum and Selepas):**
1. Tahap Kemahiran — Tahap kemahiran saya berkaitan topik latihan ini
2. Peningkatan Kemahiran — Tahap kemahiran saya berubah sebelum / selepas menghadiri latihan ini
3. Aplikasi Kemahiran — Tahap keyakinan untuk mengaplikasi kemahiran ini berubah sebelum / selepas menghadiri sesi latihan ini
4. Penyelesaian Masalah — Tahap keupayaan saya menyelesaikan masalah berkaitan tugas menggunakan kemahiran yang dipelajari

**Data:** same `evaluations.answers` JSONB, tagged `{ version: 2, q1: { before, after }, …, comment }`. No migration. Existing 813 rows (2025–2026, v1 BAGUS/SEDERHANA/LEMAH) untouched and still shown the old way.

- [x] `lib/evaluationForms.ts`: switch-over rule by program start date (MYT), v2 questions/scale, summary maths (+ unit tests)
- [x] Staff form: v2 grid for 2027 programs (v1 unchanged)
- [x] Program Details: v2 summary (overall Δ, % improved, per-question before→after, per-staff table, comments)
- [x] Training Evaluations: v2 columns (before → after, Peningkatan) + master chart (avg improvement per program) + KPIs; PDF
- [x] `/preview/evaluation` shows the v2 form for MPC
- [x] Verify: unit tests (switch-over date incl. MYT midnight, maths, v1 rows ignored), tsc 0, build ✅; admin v2 views need a 2027 response to see with data

---

# Annual evaluation — manual open/close + skip a year (2026-10-23)

**Decisions (Hazman):** same manual control as the proposal window (Ikut tarikh / Buka sekarang / Tutup sekarang), replacing the one-way "Tutup kitaran"; closed = enforced (no staff/supervisor submissions, no reminders). 2025 is considered finished, so it may close by its dates (ended 31 Mac 2026; 151 still pending — accepted). MPC may skip 2026 → "Langkau tahun" with "Batal langkau" rollback; skipping deletes nothing.

**Data:** additive migration on `annual_evaluation_cycles`: `window_mode` (auto/open/closed, default auto), `skipped_at`, `skipped_by`. Existing `status = 'closed'` (2024) → `window_mode = 'closed'`; `status` becomes legacy. Skipping a year with no cycle stores an empty placeholder cycle; undoing it removes the placeholder so the year can be created normally. Old frontend keeps working (additive), so: apply migration → then push.

- [x] `lib/windowState.ts` (shared open/closed rule; proposals reuse it) + `lib/annualCycle.ts` (open / scheduled / closed / skipped) + unit tests
- [x] Migration + `types.ts` — applied to prod by Hazman 2026-10-23 (2024 → closed, 2025 → auto, 611 evaluations untouched); `types.ts` regenerated from prod = identical to the hand edit
- [x] Hooks: set window mode, skip / undo skip; skipped cycles hidden from staff + supervisor queries; reminders only while open; submit guarded on an open cycle
- [x] Admin cycle page: period card with manual control (replaces "Tutup kitaran"), skipped banner + Batal langkau; set dates / reset no longer tied to legacy `status`
- [x] Admin cycles list: phase badge, "Langkau tahun" dialog, "Batal langkau" on skipped rows, stats notice for a skipped year
- [x] Staff + supervisor pages: closed notice, no start/evaluate buttons while closed
- [x] Verify: unit tests (dates inclusive, manual override, skip beats manual open, proposal window unchanged), tsc 0, lint unchanged (147 pre-existing), build ✅, dev compile 200; live read-only: 2024 + 2025 read as closed
- [ ] Hazman: look at the admin cycle page + list on localhost (skip/undo writes to the live DB, reversible)

---

# Program evaluation v2 — analysis on question 2 only (MPC, 2026-10-23)

**MPC's rule:** the v2 analysis uses only Q2 (Peningkatan Kemahiran — "Tahap kemahiran saya berubah sebelum / selepas menghadiri latihan ini"). Each respondent: Selepas > Sebelum = **Meningkat**, Selepas < Sebelum = **Menurun**, same = **Tiada perubahan**. Percentages are of the staff who answered, not of everyone assigned (e.g. peserta 40, penilaian 30 → meningkat 24 (80%), menurun 5 (17%), tiada perubahan 1 (3%)). Replaces the 4-question averages. The form itself is unchanged (all 4 questions still collected).

- [x] `lib/evaluationForms.ts`: `summarizeSkillChange` (Q2 counts) replaces `summarizeImprovement` + unit tests with MPC's example
- [x] Program Details: v2 card like v1's layout: donut left, analysis figures right (peserta, penilaian, meningkat/menurun/tiada perubahan with bars), per-staff Q2 table (sebelum → selepas, status), comments; header badge "Meningkat 80%"
- [x] Training Evaluations: KPI cards (penilaian, meningkat, tiada perubahan, menurun) + per-program 100% stacked bar ranked by % meningkat; table "Keputusan" + PDF cells
- [x] New `--chart-neutral` token for "Tiada perubahan" (validated: adjacent CVD ΔE ≥ 8.8, normal ≥ 24.8, both modes)
- [x] Verify: 6 unit tests incl. MPC's 40/30 → 80/17/3 example and "only Q2 counts", tsc 0, lint 147 (unchanged), build ✅, dev compile 200 on all 12 changed modules, no component dropped vs HEAD
- [x] Hazman screenshotted it with a dev-only preview (7 real 2026 programs shown as 2027 with made-up Q2 answers; nothing written; preview removed before commit)

---

# List screens to one standard — 2026-10-26 (from Sham's "sort Users by hours")

**Why:** MPC keeps sending one-off table requests (sort here, filter there). Hazman: do one sweep so every list screen already does what they'd ask for. Read-only audit of all 3 areas (admin training, admin staff, staff/supervisor) done by 3 agents; key claims spot-checked in code. Live DB counts not checked (auto-mode blocks prod reads — need Hazman to allow or run one query, see Q3).

**Done (uncommitted):** `lib/sort.ts` (stable, empty-last, numeric-aware BM collation; unit-tested in scratchpad), `hooks/useTableSort.ts` (sort kept in URL `?sort=-hours`), `common/SortableTableHead.tsx` (aria-sort, arrow, BM/EN tooltip). Users list: every column sortable. tsc 0, eslint clean on changed files.

## The standard every list screen meets
1. Click any column header to sort (`useTableSort` + `SortableTableHead`).
2. Search, filters and sort live in the URL → coming back from a detail page keeps them; links can be shared. Back links (`PageHeader backTo`, save redirects) return to the filtered list.
3. Same "Menunjukkan X daripada Y" line + "Kosongkan penapis" everywhere.
4. **Export the current view**: CSV of exactly what's on screen (filters + sort applied), BM headers, totals row where there are numbers. PDF stays where an official report exists.
5. One shared year picker (today: 4 different year lists).
6. Loading / empty / error states on every page.
Built as small shared pieces (`useTableSort`, `useUrlFilters`, `YearSelect`, `ResultCount`, `exportTableCsv`), not one big DataTable component — pages stay readable and keep their current look.

## Phase 1 — 40-hour compliance (what Sham actually needs)
- [x] Users: quick-filter tiles (Kakitangan aktif / Capai 40 j / Belum capai 40 j / Tiada jam) using the cycle page's StatCard-as-filter pattern; compliance counts only active, non-admin staff; hours cell shows progress against 40 (`getComplianceTone`); "baki" (hours still needed) column.
- [x] Users: status filter (aktif / tidak aktif), supervisor filter incl. "Tiada penyelia" (the annual-eval alert already links here for that); role shown.
- [x] Users: CSV of the current view (nama, emel, jawatan, penyelia, jam, sasaran, baki, status).
- [x] Reports: new **"Ringkasan jam latihan kakitangan"** — one row per active staff member incl. 0 hours: total hours, % of 40, Capai/Belum. CSV + PDF. Replaces the manual work Sham does on the per-training report today.
- [x] Admin dashboard: "Belum capai 40 jam" tile → opens Users already filtered.
- [x] Fix: hours paging has no `.order()` (C5) → totals can double-count/drop rows past 1,000 assignments (`useUsers.ts:89`, `useAdminDashboard.ts:133`, `useLeaderboard.ts:41`, Reports ×3).
- [x] Fix: one date decides which year a program's hours count in (Q1) — Users/Reports/MyTrainings use start date, staff dashboard/leaderboard use end date.
- [x] Fix: leaderboards rank inactive staff and admins.

## Phase 2 — the standard on every admin table
- [x] Programs: sort (tarikh, tajuk, jam, peserta); search title + description; filters "penilaian diperlukan", tempatan/luar negara, "semua tahun"; CSV.
- [x] Program details → peserta: search, sort, "belum menilai" filter, CSV (the follow-up list HR chases).
- [x] Training evaluations: sort; response-rate column + "respons rendah" filter; CSV beside the PDF; PDF headers in BM; back link from program details returns here (today goes to Programs).
- [x] Annual cycle: sort (nama, penyelia, status, markah); supervisor filter; filters in URL; CSV of results; result page back link keeps filters; stable row order (today all rows share one `created_at`).
- [x] Proposed trainings: search, "dipertimbang" filter, sort, count line; **"belum mencadang"** list; CSV follows the view; fix opening on the wrong year when the period isn't the default Dec–Feb.
- [x] Reports: BM headers in CSV/PDF (today raw keys / English), totals in exports, PDF header from the generated data not the live filters (B16), "Tidak diperlukan" instead of "Belum" for programs without evaluation.
- [x] Program assign: "pilih semua yang ditapis".
- Not touched: Attendance + Certificates (URL-only; MPC: no attendance in system, 0 certificate files).

## Phase 3 — staff and supervisors
- [x] New **"Pasukan saya"** for supervisors: team's hours vs 40, who's below (hook `useStaffBySupervisor` already exists, unused).
- [x] My trainings: proper transcript PDF (ignores search, full titles, date order, header on every page, name + jawatan) + CSV; sort; error state.
- [x] Supervisee evaluations: search, sort, "Lihat" for every status, year kept in URL.
- [x] My hours: year picker + list of the programs behind the total.

## Phase 4 — user admin gaps that block filters
- [ ] User edit: active/inactive switch (`useDeactivateUser` exists, never wired — today "inactive" can only be set in the DB); searchable supervisor picker (~300 names in a plain list).
- [ ] ~~Users page links to bulk import~~ (done in Phase 1); bulk import fixes (B7: in-file duplicate fails the whole batch, blank JAWATAN wipes position).

## Bugs found on the way (fix inside the phase that touches the file)
- Staff can evaluate No-Show / unfinished programs and then download a certificate (B10, needs D2).
- [x] Re-opening an evaluation by URL hits the unique constraint → raw Postgres error. (Phase 3)
- Certificate delete never removes the file (`useCertificates.ts:148` drops the `certificates/` folder).
- [x] Staff dashboard leaderboard / history show "empty" while loading or on error. (Phase 3)

## Decisions (Hazman, 2026-10-26: "go with recs")
Q1 start date · Q2 active non-admin staff · Q3 no department filter for now (no data source) · Q4 sort pushed now, then one push per phase.

## Questions for Hazman (answered above)
- **Q1 Year of a program's hours** — start date or end date? Rec: **start date** (admin Users, Reports, Programs, MyTrainings already use it; only 2 dashboard hooks change).
- **Q2 Who counts toward the 40 h target** — rec: active staff without the admin role. (Separately: annual cycles currently enrol admins too — intended?)
- **Q3 Department / grade** — no screen or import sets them, so a department filter is only useful if MPC has the data. Needs one read-only count on prod (blocked for me in auto mode).
- **Q4 Ship order** — rec: push the Users sort now (Sham gets it today), then one push per phase.

## Review — Phase 1 (2026-10-26)
- **Shared pieces:** `lib/trainingTarget.ts` (40 h, who counts, bands, `hasAdminRole` — also used by login), `hooks/useUrlFilters.ts` (filters in the URL), `hooks/useReturnTo.ts` + `PageHeader` (back link returns to the list as you left it), `common/SearchableSelect.tsx`, `lib/reportQueries.ts`. Data functions pulled out of hooks so they can be run outside React: `fetchUsersWithTrainingHours`, `fetchAdminDashboard`, `fetchLeaderboard`, `fetchEmployeeDashboardStats`.
- **Users:** tiles Kakitangan aktif / Capai / Belum capai / Tiada jam filter the table; status + supervisor (searchable, incl. "Tiada penyelia") filters; "Baki ke 40 j" column (sortable); Pentadbir badge; CSV of the view; Import CSV button; all state in the URL; edit → save/back returns to the filtered list. Query key now under `['users', …]` so user edits refresh it (B15 partly).
- **Reports:** new first tab "Ringkasan jam kakitangan" (same function as Users → same numbers). All reports: column config, sortable headers, CSV/PDF in BM, exports follow the on-screen sort, PDF heading/file name from what was generated (B16), totals in PDF footer, "Tidak diperlukan" for programs without evaluation, queries filtered in the DB and ordered.
- **Dashboards:** admin "Belum capai 40 jam" tile → `/admin/users?year=…&target=below&sort=hours`. Year = program start date everywhere (admin dashboard, staff dashboard, leaderboards); leaderboards only active non-admin staff; staff pending-evaluation count is one query instead of one per program.
- **Verified:** tsc 0 · lint 147 → 145 · build ✅ · unit tests (sort, target rules) · **local stack** (Docker: Postgres 15 + PostgREST v12.2.3 with the 1,000-row cap, production baseline schema, fake data incl. cross-year / 31 Dec 20:00 / 1 Jan 00:00 MYT programs, a leaver, an admin, 1,100 bulk staff): 23 data checks on the real hook/report functions + 10 server-render checks of Users (URL filters/sort), dashboard tile and Reports tabs — all pass. Harness lives in the session scratchpad (not in the repo).
- **Not verified:** clicks in a real browser (popover search, CSV/PDF download, tile toggling); numbers on the live DB (prod reads are blocked for me).

## Review — Phase 2 (2026-10-26)
- **Shared:** `common/PeriodFilter` + `lib/period.ts` (one year list 2023 → next year, "semua tahun" where useful; picking from > to moves the other end, so a range is never silently empty — B16). Supervisor filter strings moved to `t.common`.
- **Programs:** search title + description; period (incl. all years), jenis latihan, penilaian filters; every column sortable; new Jenis column; CSV (BM) of the view; filters in the URL; detail/edit links return to the filtered list.
- **Program details → peserta:** search (nama / emel / jawatan), "belum menilai" filter, sortable, CSV, "N belum menilai" in the card header.
- **Training evaluations:** search, period picker, new "Kadar maklum balas" column (responses ÷ participants, capped at 100, only for programs needing evaluation; under 50% flagged) + "kurang 50%" filter; sortable (result sorts by score / % meningkat); CSV beside PDF; PDF headers in BM, header repeated on every page, rows in on-screen order; program links come back to this page (was: Programs).
- **Annual cycle:** sortable (default nama — row order was undefined), search also covers jawatan + penyelia, searchable supervisor filter incl. "Tiada penyelia", filters in the URL (kept when opening a result), CSV with self/supervisor scores, %, penarafan and dates, "Menunjukkan X daripada Y".
- **Proposed trainings:** opens on the year staff are proposing for (period end-date year; was the hard-coded December rule); search, "dipertimbangkan" filter, sortable; new tile + list **"Belum mencadang"** (active non-admin staff without a proposal), CSV follows the view (proposals or missing list).
- **Assign staff:** "Pilih semua yang dipaparkan (N)" + "Kosongkan pilihan". `useUsers()` paged (was capped at 1,000 rows).
- **Verified:** tsc 0 · lint 145 → 137 · build ✅ · local stack: Phase 1 data checks still pass + 24 render checks that run each page's **real hooks** against the local PostgREST (render → run the queries the page created → render again) covering every filter/sort above.
- **Not verified:** clicks/downloads in a real browser.

## Review — Phase 3 (2026-10-26)
- **Pasukan saya** (`/dashboard/my-team`, in the staff menu only for people with active direct reports — `useHasTeam`): team hours vs 40 for a chosen year, tiles (ahli / capai / belum capai / tiada jam) that filter, search, sortable, "Baki ke 40 j", CSV. Same start-date rule as Users. `fetchTeamTrainingHours` batches ids 100 at a time.
- **Latihan saya:** year + search in the URL, sortable, CSV of the view, error state; **"Rekod latihan (PDF)"** = every program of the year in date order (ignores the search box), full titles wrapped, header on every page, nama + jawatan + jumlah jam vs sasaran 40 j. Count line shows hours.
- **Jam latihan saya:** year picker; table of the programs behind the total.
- **Penilaian kakitangan:** year in the URL, search (nama / jawatan), jawatan column, sortable (default: waiting for you → waiting for staff → done, by name), tiles filter by status, "Lihat" also for an evaluation waiting on a closed cycle; back from the form/detail keeps the filters.
- **Fixes:** evaluation form says "Penilaian telah dihantar" instead of a Postgres duplicate-key error; staff dashboard leaderboard + annual history show skeleton / error instead of "empty" while loading or on failure; "Terkini" on Penilaian saya no longer picks 2024 demo data.
- **Verified:** tsc 0 · lint 137 → 129 · build ✅ · local stack: Phase 1 + 2 checks still pass + 15 staff-side render checks through the real hooks (signed in as a staff member / a supervisor; real EmployeeLayout menu).
- **Not verified:** clicks/downloads in a real browser; PDF layout by eye.
