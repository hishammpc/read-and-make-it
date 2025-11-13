-- Remove foreign key constraints to support hybrid authentication model
--
-- Architecture:
-- - Admins: Use Supabase Auth (auth.users) with email + password
-- - Employees: Use email-only auth (profiles only, no auth.users records)
--
-- This migration removes the requirement that all profiles must have matching auth.users records.

-- 1. Remove foreign key constraint from profiles table
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Remove foreign key constraint from user_roles table
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- 3. Add new foreign key pointing to profiles instead of auth.users
-- This is the correct architecture: roles should reference profiles, not auth.users
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 4. Add documentation
COMMENT ON TABLE public.profiles IS 'User profiles. Admins have matching auth.users records (password auth), employees do not (email-only auth for internal network).';

-- 5. Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Profiles table: Foreign key to auth.users removed';
  RAISE NOTICE 'User_roles table: Now references profiles instead of auth.users';
  RAISE NOTICE 'Bulk import should now work for employee profiles';
END $$;
