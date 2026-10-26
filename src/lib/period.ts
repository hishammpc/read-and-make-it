// Year / month-range filters shared by list pages (see common/PeriodFilter).

/** Years the app has data for, newest first: 2023 (first records) to next year (planned programs). */
export const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() + 1 - 2023 + 1 },
  (_, i) => String(new Date().getFullYear() + 1 - i)
);

export interface Period {
  /** '2026', or 'all' when `allowAllYears` */
  year: string;
  /** '' or 'all' = from January; '1'–'12' */
  from: string;
  /** '' or 'all' = to December; '1'–'12' */
  to: string;
}

const monthNumber = (value: string, fallback: number) => (value && value !== 'all' ? parseInt(value) : fallback);

/** The month range a Period covers, 1–12 inclusive. */
export function periodMonths(period: Pick<Period, 'from' | 'to'>): { from: number; to: number } {
  return { from: monthNumber(period.from, 1), to: monthNumber(period.to, 12) };
}
