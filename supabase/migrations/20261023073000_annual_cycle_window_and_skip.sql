-- Annual evaluation cycles: admin manual open/close and skip a year (MPC, 2026-10-23).
--
-- window_mode  'auto'   = open between start_date and end_date (inclusive, MYT)
--              'open'   = opened manually by an admin, whatever the dates
--              'closed' = closed manually by an admin, whatever the dates
-- skipped_at   set when the year is skipped: the cycle is hidden from staff and supervisors
--              and nothing can be submitted. No data is deleted; clearing it undoes the skip.
--              A year skipped before it had a cycle is stored as a cycle with no evaluations.
--
-- Additive only: the app version before this change ignores the new columns.

ALTER TABLE public.annual_evaluation_cycles
  ADD COLUMN window_mode text NOT NULL DEFAULT 'auto'
    CONSTRAINT annual_evaluation_cycles_window_mode_check
    CHECK (window_mode = ANY (ARRAY['auto'::text, 'open'::text, 'closed'::text])),
  ADD COLUMN skipped_at timestamptz,
  ADD COLUMN skipped_by uuid
    CONSTRAINT annual_evaluation_cycles_skipped_by_fkey REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Cycles closed with the old one-way "Tutup kitaran" button stay closed
UPDATE public.annual_evaluation_cycles SET window_mode = 'closed' WHERE status = 'closed';

COMMENT ON COLUMN public.annual_evaluation_cycles.status IS
  'Legacy (until 2026-10): open/closed now comes from window_mode and the dates.';
COMMENT ON COLUMN public.annual_evaluation_cycles.window_mode IS
  'auto = open between start_date and end_date; open / closed = admin manual override.';
COMMENT ON COLUMN public.annual_evaluation_cycles.skipped_at IS
  'Year skipped by an admin: hidden from staff and supervisors, no submissions. Data kept; NULL = not skipped.';
