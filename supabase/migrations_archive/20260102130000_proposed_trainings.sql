-- Proposed Trainings Feature
-- Allows employees to submit training proposals during Dec 1 - Jan 31

CREATE TABLE IF NOT EXISTS proposed_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  proposal_1 TEXT,
  proposal_2 TEXT,
  is_entertained BOOLEAN DEFAULT FALSE,
  entertained_at TIMESTAMP WITH TIME ZONE,
  entertained_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE proposed_trainings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own proposals
CREATE POLICY "Users can view own proposals"
  ON proposed_trainings FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own proposals
CREATE POLICY "Users can insert own proposals"
  ON proposed_trainings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own proposals
CREATE POLICY "Users can update own proposals"
  ON proposed_trainings FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admin can view all proposals
CREATE POLICY "Admin can view all proposals"
  ON proposed_trainings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admin can update all proposals (for entertained status)
CREATE POLICY "Admin can update all proposals"
  ON proposed_trainings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposed_trainings_user_year
  ON proposed_trainings(user_id, year);

CREATE INDEX IF NOT EXISTS idx_proposed_trainings_year
  ON proposed_trainings(year);
