// State of an annual evaluation cycle. Staff and supervisors can submit only while it is open:
// within its dates (or opened manually by an admin) and not skipped. A skipped cycle is hidden
// from staff and supervisors; its data is kept and comes back if the skip is undone.
import { getDateWindowState, localTodayStr, type WindowMode } from '@/lib/windowState';

export interface CycleWindowFields {
  start_date: string;
  end_date: string;
  window_mode?: WindowMode | string | null;
  skipped_at?: string | null;
}

export type CyclePhase = 'open' | 'scheduled' | 'closed' | 'skipped';

/** A cycle embedded in an annual_evaluations row (`cycle:cycle_id(...)`). */
export type EmbeddedCycle = CycleWindowFields & { id: string; year: number };

/**
 * The embedded cycle of a row; supabase-js can't type column-hinted embeds, so it's asserted here once.
 * The embed must select start_date, end_date, window_mode and skipped_at, or the cycle reads as closed.
 */
export const embeddedCycle = (row: unknown) => ((row as { cycle?: unknown } | null)?.cycle ?? null) as EmbeddedCycle | null;

export const isCycleSkipped = (cycle: { skipped_at?: string | null } | null | undefined) => !!cycle?.skipped_at;

export function getCycleState(cycle: CycleWindowFields | null | undefined, todayStr: string = localTodayStr()) {
  const mode: WindowMode =
    cycle?.window_mode === 'open' || cycle?.window_mode === 'closed' ? cycle.window_mode : 'auto';
  const skipped = isCycleSkipped(cycle);
  const dates = getDateWindowState(cycle?.start_date ?? null, cycle?.end_date ?? null, mode, todayStr);
  const isOpen = !!cycle && !skipped && dates.isOpen;
  const phase: CyclePhase = skipped
    ? 'skipped'
    : isOpen
      ? 'open'
      : mode === 'auto' && dates.isBeforeStart
        ? 'scheduled'
        : 'closed';

  return { ...dates, mode, skipped, isOpen, phase };
}
