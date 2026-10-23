-- Backfill 2024 Annual Evaluations with Sample Data
-- This migration creates sample completed evaluations for 2024 to demonstrate the spider chart

-- Set Muhammad Hisham Nordin as supervisor for all active staff (except himself)
UPDATE profiles
SET supervisor_id = '3b593809-8ddb-4ea4-b0f5-1fd87fb1a906'
WHERE status = 'active'
  AND id != '3b593809-8ddb-4ea4-b0f5-1fd87fb1a906'
  AND supervisor_id IS NULL;

-- First, create the 2024 evaluation cycle if it doesn't exist
INSERT INTO annual_evaluation_cycles (id, year, start_date, end_date, status, created_at)
VALUES (
  gen_random_uuid(),
  2024,
  '2024-12-01',
  '2025-02-28',
  'closed',
  '2024-12-01 09:00:00+08'
)
ON CONFLICT (year) DO NOTHING;

-- Create evaluations for all active staff with sample data
-- We'll use a PL/pgSQL block to handle this
DO $$
DECLARE
  cycle_id_2024 UUID;
  staff_record RECORD;
  staff_answers JSONB;
  supervisor_answers JSONB;
BEGIN
  -- Get the 2024 cycle ID
  SELECT id INTO cycle_id_2024 FROM annual_evaluation_cycles WHERE year = 2024;

  -- Exit if no cycle found
  IF cycle_id_2024 IS NULL THEN
    RAISE NOTICE 'No 2024 cycle found';
    RETURN;
  END IF;

  -- Loop through all active staff
  FOR staff_record IN
    SELECT id, supervisor_id FROM profiles WHERE status = 'active'
  LOOP
    -- Generate random answers (tahap 1-5) for each of the 10 questions
    -- Staff tend to rate themselves slightly higher (3-5)
    staff_answers := jsonb_build_object(
      'q1', (floor(random() * 3) + 3)::int,  -- 3-5
      'q2', (floor(random() * 3) + 3)::int,
      'q3', (floor(random() * 3) + 3)::int,
      'q4', (floor(random() * 3) + 3)::int,
      'q5', (floor(random() * 3) + 3)::int,
      'q6', (floor(random() * 3) + 3)::int,
      'q7', (floor(random() * 3) + 3)::int,
      'q8', (floor(random() * 3) + 3)::int,
      'q9', (floor(random() * 3) + 3)::int,
      'q10', (floor(random() * 3) + 3)::int
    );

    -- Supervisor answers tend to be more varied (2-5)
    supervisor_answers := jsonb_build_object(
      'q1', (floor(random() * 4) + 2)::int,  -- 2-5
      'q2', (floor(random() * 4) + 2)::int,
      'q3', (floor(random() * 4) + 2)::int,
      'q4', (floor(random() * 4) + 2)::int,
      'q5', (floor(random() * 4) + 2)::int,
      'q6', (floor(random() * 4) + 2)::int,
      'q7', (floor(random() * 4) + 2)::int,
      'q8', (floor(random() * 4) + 2)::int,
      'q9', (floor(random() * 4) + 2)::int,
      'q10', (floor(random() * 4) + 2)::int
    );

    -- Insert the evaluation (skip if already exists)
    INSERT INTO annual_evaluations (
      cycle_id,
      user_id,
      supervisor_id,
      staff_answers,
      supervisor_answers,
      staff_submitted_at,
      supervisor_submitted_at,
      status,
      created_at
    )
    VALUES (
      cycle_id_2024,
      staff_record.id,
      staff_record.supervisor_id,
      staff_answers,
      supervisor_answers,
      '2024-12-15 10:00:00+08',
      '2025-01-10 14:00:00+08',
      'completed',
      '2024-12-01 09:00:00+08'
    )
    ON CONFLICT (cycle_id, user_id) DO UPDATE
    SET
      staff_answers = EXCLUDED.staff_answers,
      supervisor_answers = EXCLUDED.supervisor_answers,
      staff_submitted_at = EXCLUDED.staff_submitted_at,
      supervisor_submitted_at = EXCLUDED.supervisor_submitted_at,
      status = EXCLUDED.status;

  END LOOP;

  RAISE NOTICE 'Successfully backfilled 2024 annual evaluations';
END $$;
