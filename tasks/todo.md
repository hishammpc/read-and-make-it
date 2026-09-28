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

- [ ] **C1 `types.ts` stale** — missing `annual_evaluation_cycles`, `annual_evaluations`, `proposed_trainings`, `bulk_uploads`; columns `profiles.supervisor_id`, `programs.notify_for_evaluation`, `programs.training_type`. Cause of most of the 126 tsc errors. Regenerate, then add `tsc --noEmit` to `build`.
- [ ] **C2 Migrations can't rebuild prod** — `programs.category NOT NULL` but ProgramForm never sends it; `proposal_1/2_entertained`, `entertained_proposal` exist in no migration. Prod was edited by hand. `supabase db pull` → commit reconciling migration. `config.toml` project_id is a placeholder.
- [ ] C3 `profiles.email` no unique index; `user_roles` allows 2 roles/user (`loginAdmin` `.single()` fails on 2).
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
- [ ] **P3 Shared components** — `PageHeader`, `StatCard`, `StatusBadge` (single source for every status → colour/label), `EmptyState`, `LoadingState`; roll out dashboards first, then lists, then forms. Replace `alert()`.
- [ ] **P4 Charts + a11y** — one `RadarScoreChart` on theme tokens (load dataviz skill first); progress/compliance colours from tokens; aria-labels, keyboard-accessible rows/cards, label `htmlFor`, mobile-stacking headers/filters.
- [ ] **P5 (optional)** — language standardisation pass; re-enable dark mode properly with a visible toggle.

## Decisions (Hazman, 2026-09-28)
- Brand: **not MPC** → refined, calmer blue on cool neutral greys (keeps continuity).
- Font: Plus Jakarta Sans, self-hosted (no objection).
- Language: **dual BM/EN, BM default**, switch in header. Official content (evaluation questions, PDFs, certificates, CSV exports) stays BM.
- Dark mode: **wanted** → proper tokens + Light/Dark/System switch. Default light until every page is converted, then consider System.

Phase changes: i18n infrastructure + switch lands in P2 (shell); pages are translated as they are restyled in P3/P4. P5 = flip default to System once all pages are dark-safe.
