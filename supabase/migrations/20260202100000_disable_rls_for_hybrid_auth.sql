-- Migration: Disable RLS for Hybrid Authentication
-- Problem: RLS policies rely on auth.uid() and JWT claims, but:
-- 1. Employees use email-only auth (no Supabase JWT)
-- 2. Admin sessions may not persist across different browsers/laptops
--
-- Solution: Disable RLS on affected tables temporarily
-- Security is handled at the application level instead

-- ============================================
-- ANNUAL EVALUATIONS - Fix assessment submission
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own evaluations" ON annual_evaluations;
DROP POLICY IF EXISTS "Users can update their own staff answers" ON annual_evaluations;
DROP POLICY IF EXISTS "Supervisors can update supervisor answers" ON annual_evaluations;
DROP POLICY IF EXISTS "Admins can manage all evaluations" ON annual_evaluations;

-- Disable RLS on annual_evaluations
ALTER TABLE annual_evaluations DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PROGRAMS - Fix admin program creation
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone authenticated can view programs" ON programs;
DROP POLICY IF EXISTS "Admins can insert programs" ON programs;
DROP POLICY IF EXISTS "Admins can update programs" ON programs;
DROP POLICY IF EXISTS "Admins can delete programs" ON programs;

-- Disable RLS on programs
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PROGRAM ASSIGNMENTS - Also affected by same issue
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own assignments" ON program_assignments;
DROP POLICY IF EXISTS "Admins can view all assignments" ON program_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON program_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON program_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON program_assignments;

-- Disable RLS on program_assignments
ALTER TABLE program_assignments DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES - Needed for user management
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Disable RLS on profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- USER_ROLES - Needed for role checks
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- Disable RLS on user_roles
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- EVALUATIONS (Training evaluations)
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Admins can view all evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can insert their own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can update their own evaluations" ON evaluations;

-- Disable RLS on evaluations
ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY;

-- ============================================
-- EVALUATION TEMPLATES
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view templates" ON evaluation_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON evaluation_templates;

-- Disable RLS on evaluation_templates
ALTER TABLE evaluation_templates DISABLE ROW LEVEL SECURITY;

-- ============================================
-- CERTIFICATES
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can view all certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can manage certificates" ON certificates;

-- Disable RLS on certificates
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ANNUAL EVALUATION CYCLES
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view evaluation cycles" ON annual_evaluation_cycles;
DROP POLICY IF EXISTS "Admins can manage evaluation cycles" ON annual_evaluation_cycles;

-- Disable RLS on annual_evaluation_cycles
ALTER TABLE annual_evaluation_cycles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PROPOSED TRAININGS (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'proposed_trainings') THEN
    DROP POLICY IF EXISTS "Users can view their own proposed trainings" ON proposed_trainings;
    DROP POLICY IF EXISTS "Users can insert their own proposed trainings" ON proposed_trainings;
    DROP POLICY IF EXISTS "Users can update their own proposed trainings" ON proposed_trainings;
    DROP POLICY IF EXISTS "Admins can view all proposed trainings" ON proposed_trainings;
    DROP POLICY IF EXISTS "Admins can update all proposed trainings" ON proposed_trainings;
    ALTER TABLE proposed_trainings DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- REMINDERS LOG
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all reminders" ON reminders_log;
DROP POLICY IF EXISTS "Admins can insert reminders" ON reminders_log;

-- Disable RLS on reminders_log
ALTER TABLE reminders_log DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Note: Storage bucket policies are NOT changed
-- as they require authenticated Supabase sessions
-- to access files directly. File access should go
-- through the application's API.
-- ============================================

COMMENT ON TABLE annual_evaluations IS 'RLS disabled for hybrid auth compatibility - security handled at application level';
COMMENT ON TABLE programs IS 'RLS disabled for hybrid auth compatibility - security handled at application level';
COMMENT ON TABLE profiles IS 'RLS disabled for hybrid auth compatibility - security handled at application level';
