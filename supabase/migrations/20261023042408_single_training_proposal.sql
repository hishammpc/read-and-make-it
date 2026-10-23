-- One training proposal per staff per year, with details and notes (requested by MPC,
-- 2026-10-23), replacing the two one-line proposals (proposal_1 / proposal_2).
--
-- Additive only: proposal_1, proposal_2 and their *_entertained flags stay untouched, so
-- the existing proposals (2026: 115 submissions) keep their original form and are still
-- shown in the old two-column layout. New submissions fill the columns below; "considered"
-- for a new-format proposal uses the existing is_entertained / entertained_at /
-- entertained_by columns.

ALTER TABLE public.proposed_trainings
  ADD COLUMN IF NOT EXISTS training_title text,
  ADD COLUMN IF NOT EXISTS training_details text,
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.proposed_trainings.training_title IS 'Proposed training (new single-proposal form, from 2027)';
COMMENT ON COLUMN public.proposed_trainings.training_details IS 'What the training covers / why it is needed';
COMMENT ON COLUMN public.proposed_trainings.notes IS 'Optional notes (provider, preferred month, cost, etc.)';
COMMENT ON COLUMN public.proposed_trainings.proposal_1 IS 'Legacy (two-proposal form, up to 2026)';
COMMENT ON COLUMN public.proposed_trainings.proposal_2 IS 'Legacy (two-proposal form, up to 2026)';
