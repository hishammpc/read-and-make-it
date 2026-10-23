# Archived migrations — reference only

These are the original migrations, kept for history. **They do not rebuild production**:
production was later changed by hand in the Supabase SQL Editor, and none of these were
applied with the Supabase CLI (there is no `supabase_migrations` history table).

Known differences from production at the time of archiving (2026-10-23):
- `programs.category` is nullable in production (NOT NULL here).
- `proposed_trainings.proposal_1_entertained`, `proposal_2_entertained`, `entertained_proposal` exist only in production.
- `20260209_system_settings.sql` uses a short version number that sorts unpredictably against `YYYYMMDDHHMMSS` files.

The source of truth is now `supabase/migrations/20261023035000_baseline_production_schema.sql`
(a structure-only dump of production) plus any migrations after it. Do not move these files
back into `supabase/migrations/`.
