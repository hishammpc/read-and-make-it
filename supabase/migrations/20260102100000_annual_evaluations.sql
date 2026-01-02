-- Annual Evaluation System Migration
-- Adds supervisor assignment and annual evaluation tables

-- 1. Add supervisor_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES profiles(id);

-- Create index for supervisor lookups
CREATE INDEX IF NOT EXISTS idx_profiles_supervisor_id ON profiles(supervisor_id);

-- 2. Create annual_evaluation_cycles table
CREATE TABLE IF NOT EXISTS annual_evaluation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(year)
);

-- 3. Create annual_evaluations table
CREATE TABLE IF NOT EXISTS annual_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES annual_evaluation_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES profiles(id),
  staff_answers JSONB,
  supervisor_answers JSONB,
  staff_submitted_at TIMESTAMP WITH TIME ZONE,
  supervisor_submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending_staff' CHECK (status IN ('pending_staff', 'pending_supervisor', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cycle_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_annual_evaluations_cycle_id ON annual_evaluations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_annual_evaluations_user_id ON annual_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_annual_evaluations_supervisor_id ON annual_evaluations(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_annual_evaluations_status ON annual_evaluations(status);

-- RLS Policies for annual_evaluation_cycles
ALTER TABLE annual_evaluation_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view evaluation cycles"
  ON annual_evaluation_cycles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage evaluation cycles"
  ON annual_evaluation_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for annual_evaluations
ALTER TABLE annual_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evaluations"
  ON annual_evaluations FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    OR supervisor_id IN (SELECT id FROM profiles WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own staff answers"
  ON annual_evaluations FOR UPDATE
  USING (
    user_id IN (SELECT id FROM profiles WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
  )
  WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
  );

CREATE POLICY "Supervisors can update supervisor answers"
  ON annual_evaluations FOR UPDATE
  USING (
    supervisor_id IN (SELECT id FROM profiles WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
  )
  WITH CHECK (
    supervisor_id IN (SELECT id FROM profiles WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
  );

CREATE POLICY "Admins can manage all evaluations"
  ON annual_evaluations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
