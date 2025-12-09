-- Add notify_for_evaluation column to programs table
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS notify_for_evaluation BOOLEAN DEFAULT false;

-- Add training_type column if not exists (for International/Local filtering in reports)
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS training_type TEXT DEFAULT 'Local' CHECK (training_type IN ('Local', 'International'));

-- Comment for documentation
COMMENT ON COLUMN public.programs.notify_for_evaluation IS 'Flag to indicate if users should be notified to complete evaluation after program ends';
COMMENT ON COLUMN public.programs.training_type IS 'Training type: Local or International (for overseas program reports)';
