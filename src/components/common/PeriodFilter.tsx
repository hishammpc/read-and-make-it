import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { YEAR_OPTIONS, periodMonths, type Period } from '@/lib/period';

/**
 * Year + month-range picker used by every list that filters by period. Picking a "from"
 * month after the "to" month (or the reverse) moves the other end along, so the range
 * is never empty by mistake. Month pickers are hidden when "all years" is chosen.
 */
export function PeriodFilter({
  value,
  onChange,
  allowAllYears = false,
}: {
  value: Period;
  onChange: (next: Partial<Period>) => void;
  allowAllYears?: boolean;
}) {
  const { t } = useLanguage();
  const monthOptions = t.common.months.map((label, index) => ({ value: String(index + 1), label }));
  const allYears = value.year === 'all';

  const setFrom = (from: string) => {
    const { to } = periodMonths(value);
    onChange(from !== 'all' && parseInt(from) > to ? { from, to: from } : { from });
  };
  const setTo = (to: string) => {
    const { from } = periodMonths(value);
    onChange(to !== 'all' && parseInt(to) < from ? { to, from: to } : { to });
  };

  return (
    <>
      <Select value={value.year} onValueChange={(year) => onChange({ year })}>
        <SelectTrigger className="w-full sm:w-32" aria-label={t.common.year}>
          <SelectValue placeholder={t.common.year} />
        </SelectTrigger>
        <SelectContent>
          {allowAllYears && <SelectItem value="all">{t.common.allYears}</SelectItem>}
          {YEAR_OPTIONS.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!allYears && (
        <div className="flex items-center gap-2">
          <Select value={value.from} onValueChange={setFrom}>
            <SelectTrigger className="w-full sm:w-40" aria-label={t.common.fromMonth}>
              <SelectValue placeholder={t.common.fromMonth} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.allMonths}</SelectItem>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground">{t.common.to.toLowerCase()}</span>

          <Select value={value.to} onValueChange={setTo}>
            <SelectTrigger className="w-full sm:w-40" aria-label={t.common.toMonth}>
              <SelectValue placeholder={t.common.toMonth} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.allMonths}</SelectItem>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
