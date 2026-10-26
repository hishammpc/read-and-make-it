# Local stack checks

Checks the app against a throwaway copy of the database on your machine, never against MPC's live project.

```bash
node scripts/local-stack/run.mjs                 # everything (~10 s)
node scripts/local-stack/run.mjs staff-pages     # one or more suites: data, admin-pages, staff-pages, actions
node scripts/local-stack/run.mjs --keep          # leave the database up afterwards, to poke at it with psql
```

Needs Docker Desktop running and `npm install` done. Nothing else (psql runs inside the container).

## What it does

1. Starts Postgres 15 and PostgREST 12 in Docker (`mlp-test-pg`, `mlp-test-rest`, ports 55432 / 53000, localhost only).
2. Loads `sql/supabase-stubs.sql` (the roles, schemas and functions Supabase normally provides), then every file in `supabase/migrations/` in order, then `sql/seed.sql`. Only one baseline error is tolerated (`supabase_vault` isn't available on plain Postgres); any other migration error stops the run.
3. Points the app's own code at it: `VITE_SUPABASE_URL` is set to a local proxy (`/rest/v1` → PostgREST). Environment variables win over `.env` / `.env.local`, and the run stops before any query unless the Supabase client really holds the local URL.
4. Loads the app through Vite (`entry.tsx`) and runs the suites:
   - `data`: the fetch functions behind the screens (hours, 40 h bands, dashboard, leaderboard, reports).
   - `admin-pages` / `staff-pages`: renders each page on the server with its real hooks, runs the queries the page creates, renders again until it's loaded, then checks the text and rows on screen. URL filters and sorts are tested by URL, e.g. `/admin/users?target=below&sort=hours`.
   - `actions`: write paths (account status, duplicate email, bulk import). It puts the data back afterwards.
5. Removes the containers.

PostgREST caps responses at 1,000 rows, like Supabase, and the seed has 1,108 staff, so missing paging shows up as a failure.

## Things to know

- **The clock is pinned to 26 Oct 2026, 10:00 MYT** (`PINNED_NOW` in `harness.mjs`) and the timezone is `Asia/Kuala_Lumpur`. The seed is written for that date, so the answers stay right in later years. Write new seed data relative to it.
- **The sign-in is stubbed** (`stubs/AuthContext.tsx`): a suite picks who is signed in with `setUser(profile, role)`. `AdminLayout` is stubbed too, so there's no PIN gate.
- **Server rendering runs no effects and no clicks.** Anything that only happens in `useEffect`, on a click, or in a download (PDF/CSV contents) isn't covered. Test those functions directly or check them by hand.
- RLS is off in production too, so policies aren't exercised here.

## The fake staff (`sql/seed.sql`)

All ids are `md5(key)::uuid`; emails are `<key>@test.my` (bulk staff: `bulk1@test.my`…).

| Who | Key | 2026 hours | Notes |
|---|---|---|---|
| A'watif Raidah Ermansyah | `awatif` | 33 (A 20 + B 13) | under Halimahton; evaluated A only; also on a program that starts in 2025 (7 h) |
| Abdul Aziz Abdul Jalil | `aziz` | 7 (C 4 + 31 Dec 3) | under Isram; also a 1 Jan 2027 program |
| Staf Empat Puluh | `forty` | 40 (A + D, Tokyo) | the only one who meets the target |
| Staf Kosong | `zero` | 0 | no supervisor |
| Zainal Bersara | `leaver` | 20 | inactive, so not counted |
| Admin Ujian | `admin` | 4 | admin, so not counted |
| Halimahton Sa'diah Let, Isram Azhar | `sup1`, `sup2` | 0 | supervisors; Halimahton has 1,102 staff |
| Pukal 0001–1100 | `bulk1`… | 2 each | under Halimahton |

Target staff (active, not admin): 1,106. Met 1, below 1,105, no hours 3. The 2026 annual cycle has six staff; proposals are for 2027 (window Dec 2026 – Feb 2027).

## Adding a check

Put it in the suite that fits, with the expected value written out:

```js
await check('what should be true', async () => {
  const html = await page(pages.UsersList, '/admin/users', '/admin/users?q=aziz');
  assert.match(text(html), /Abdul Aziz Abdul Jalil/);
});
```

A new page goes in `pages` in `entry.tsx` first. If a check needs new data, add it to `sql/seed.sql` and update the counts above and in the suites that change.
