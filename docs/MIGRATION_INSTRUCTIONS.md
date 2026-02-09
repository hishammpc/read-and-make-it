# Database Migration Instructions - Fix Bulk Import

## Quick Summary
The bulk import is failing because the database requires all profiles to have matching Supabase Auth users. This migration removes that requirement to support your email-only authentication for employees.

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### 2. Run Migration #1 (Bulk Uploads Table)
If you haven't already run this:
1. Click **New Query**
2. Copy and paste the contents of: `supabase/migrations/20251113131903_bulk_uploads.sql`
3. Click **Run** (or press Cmd/Ctrl + Enter)
4. Should see: "Success. No rows returned"

### 3. Run Migration #2 (Remove Foreign Key Constraints) ⚠️ REQUIRED
1. Click **New Query**
2. Copy and paste the contents of: `supabase/migrations/20251113133713_remove_auth_fk.sql`
3. Click **Run** (or press Cmd/Ctrl + Enter)
4. Should see: "Success. No rows returned" with notices about migration completed

**Or copy this SQL directly:**

```sql
-- Remove foreign key constraints to support hybrid authentication model
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

COMMENT ON TABLE public.profiles IS 'User profiles. Admins have matching auth.users records (password auth), employees do not (email-only auth for internal network).';
```

### 4. Verify Migration Worked
Run this query to check:
```sql
-- Check constraints on profiles table
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- Check constraints on user_roles table
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.user_roles'::regclass;
```

You should see:
- `profiles` has NO foreign key to auth.users ✅
- `user_roles` has foreign key to `profiles` (not auth.users) ✅

### 5. Test Bulk Import
1. Go back to your app: `/admin/users/bulk-import`
2. Upload your CSV file again
3. Click "Import Users"
4. Should now succeed with: "Import complete: 303 created, 0 updated, 0 failed" 🎉

## What This Migration Does

### Before Migration:
```
profiles.id → MUST exist in auth.users.id ❌
user_roles.user_id → MUST exist in auth.users.id ❌
Bulk import creates random UUIDs → Foreign key violation ❌
```

### After Migration:
```
profiles.id → Independent (can be any UUID) ✅
user_roles.user_id → MUST exist in profiles.id ✅
Bulk import creates random UUIDs → Works perfectly ✅
```

## Architecture Explanation

Your system uses **hybrid authentication**:

**Admins (2-3 people):**
- Created via Supabase Auth Dashboard
- Have records in `auth.users` table
- profile.id = auth.users.id (matching UUIDs)
- Login at `/admin/login` with email + password
- RLS policies work via `auth.uid()`

**Employees (300+ people):**
- Created via bulk import or admin UI
- NO records in `auth.users` table
- profile.id = random UUID
- Login at `/auth` with email only (no password)
- Access data via admin-assigned programs

This migration aligns the database structure with this hybrid model.

## Troubleshooting

### Error: "constraint does not exist"
This is fine! It means the constraint was already removed or never existed. The migration uses `IF EXISTS` to be safe.

### Error: "permission denied"
You need to be the database owner or have superuser access. Make sure you're logged in as the project owner.

### Migration ran but import still fails
1. Refresh your browser (clear cache)
2. Check the migration ran successfully (run verification query above)
3. Check browser console for different error messages

### Still having issues?
Check:
1. `.env` file has correct Supabase credentials
2. Supabase project is not paused
3. RLS policies are enabled (they should be)

## Rollback (if needed)

If something goes wrong, you can restore the foreign keys:

```sql
-- WARNING: This will fail if you have employee profiles!
-- Only run this if you want to go back to admin-only system

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
```

## Summary

1. Run migration: `20251113133713_remove_auth_fk.sql`
2. Test bulk import
3. Should work immediately! ✅

The migration takes ~1 second to run and requires no code changes.
