// Open/closed rule for date-bound windows (the proposal period, annual evaluation cycles).
// Dates are inclusive YYYY-MM-DD strings compared with today's local date (MYT for our users).

/** Admin override: follow the dates, or force the window open/closed. */
export type WindowMode = 'auto' | 'open' | 'closed';

/** Today's date as YYYY-MM-DD in local time (MYT for our users). */
export function localTodayStr(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDateWindowState(
  startDate: string | null,
  endDate: string | null,
  mode: WindowMode,
  todayStr: string
) {
  const withinDates = startDate && endDate ? todayStr >= startDate && todayStr <= endDate : false;
  // The admin's manual override wins over the dates
  const isOpen = mode === 'open' ? true : mode === 'closed' ? false : withinDates;
  const isPastEnd = !!endDate && todayStr > endDate;
  const isBeforeStart = !!startDate && todayStr < startDate;

  return { withinDates, isOpen, isPastEnd, isBeforeStart };
}
