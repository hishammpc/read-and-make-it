-- One profile per email (case-insensitive) and one role per user.
--
-- Login looks a profile up by email and `.maybeSingle()` errors when two rows match,
-- which locked the person out ("Error checking user"). Duplicate profiles could come
-- from bulk import, manual user creation, or the on_auth_user_created trigger.
-- loginAdmin and the role resolution also assume one role row per user.
--
-- Checked on production before applying (2026-10-23): 0 duplicate emails
-- (case-insensitive), every user has exactly one role row.
--
-- Side effect: creating a Supabase Auth user whose email already has a profile now
-- fails in handle_new_user() instead of silently creating a duplicate profile.

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key
  ON public.profiles (lower(email));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_key' AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;
