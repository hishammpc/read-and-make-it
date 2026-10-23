import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToneBadge } from '@/components/common/StatusBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  V2_QUESTIONS,
  formatChange,
  getChangeTone,
  type ImprovementSummary,
} from '@/lib/evaluationForms';

/** Position (0–100%) of a 1–5 rating on the track */
const pos = (value: number) => ((value - 1) / 4) * 100;

/**
 * One program's results on the before/after form: headline figures, per-question
 * dumbbells (before = light, after = solid, same hue) and each staff member's own change.
 */
export function ProgramImprovementDetails({
  improvement,
  staffNames,
}: {
  improvement: ImprovementSummary;
  /** user id → name (from the program's assignments) */
  staffNames: Record<string, string>;
}) {
  const { t } = useLanguage();
  const td = t.adminTraining.programDetails;

  const respondents = [...improvement.respondents].sort((a, b) => b.avgChange - a.avgChange);

  return (
    <div className="space-y-6">
      {/* Headline figures */}
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <dt className="text-xs font-medium text-muted-foreground">{td.beforeAfter}</dt>
          <dd className="mt-1 text-xl font-semibold">
            {improvement.avgBefore.toFixed(1)} → {improvement.avgAfter.toFixed(1)}
          </dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-xs font-medium text-muted-foreground">{td.averageImprovement}</dt>
          <dd className="mt-1">
            <ToneBadge tone={getChangeTone(improvement.avgChange)} className="px-2.5 py-1 text-base">
              {formatChange(improvement.avgChange)}
            </ToneBadge>
          </dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-xs font-medium text-muted-foreground">{td.staffImproved}</dt>
          <dd className="mt-1 text-xl font-semibold">
            {Math.round(improvement.improvedShare * 100)}%{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({improvement.respondents.filter((r) => r.avgChange > 0).length}/{improvement.responses})
            </span>
          </dd>
        </div>
      </dl>

      {/* By question: dumbbell on a 1–5 track */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">{td.byQuestion}</h4>
          <ul className="flex items-center gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-chart-1/35" />
              {td.before}
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-chart-1" />
              {td.after}
            </li>
          </ul>
        </div>
        <ul className="space-y-4">
          {improvement.questions.map((q) => {
            const lo = Math.min(q.avgBefore, q.avgAfter);
            const hi = Math.max(q.avgBefore, q.avgAfter);
            const declined = q.avgChange < 0;
            return (
              <li
                key={q.id}
                className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_7.5rem] sm:items-center"
              >
                <span className="text-sm font-medium">{q.short}</span>
                <div
                  className="relative h-4"
                  role="img"
                  aria-label={`${q.short}: ${td.before} ${q.avgBefore.toFixed(1)}, ${td.after} ${q.avgAfter.toFixed(1)}`}
                >
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                  {[1, 2, 3, 4, 5].map((tick) => (
                    <div
                      key={tick}
                      className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-border"
                      style={{ left: `${pos(tick)}%` }}
                    />
                  ))}
                  <div
                    className={cn(
                      'absolute top-1/2 h-1 -translate-y-1/2 rounded-full',
                      declined ? 'bg-destructive/60' : 'bg-chart-1/50'
                    )}
                    style={{ left: `${pos(lo)}%`, width: `${pos(hi) - pos(lo)}%` }}
                  />
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1/35 ring-2 ring-card"
                    style={{ left: `${pos(q.avgBefore)}%` }}
                  />
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-2 ring-card"
                    style={{ left: `${pos(q.avgAfter)}%` }}
                  />
                </div>
                <span className="text-sm tabular-nums sm:text-right">
                  {q.avgBefore.toFixed(1)} → {q.avgAfter.toFixed(1)}{' '}
                  <span className={cn('font-semibold', declined ? 'text-destructive' : q.avgChange > 0 && 'text-success')}>
                    ({formatChange(q.avgChange)})
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{td.scaleNote}</p>
      </section>

      {/* By staff member: each person's own before → after */}
      <section>
        <h4 className="mb-2 text-sm font-medium text-muted-foreground">{td.byStaff}</h4>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td.colStaff}</TableHead>
                {V2_QUESTIONS.map((q) => (
                  <TableHead key={q.id} className="whitespace-nowrap text-center" title={q.text}>
                    {q.short}
                  </TableHead>
                ))}
                <TableHead className="text-right">{td.colChange}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {respondents.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="font-medium">{staffNames[r.userId] || '—'}</TableCell>
                  {V2_QUESTIONS.map((q) => (
                    <TableCell key={q.id} className="whitespace-nowrap text-center text-sm">
                      {r.ratings[q.id].before} → {r.ratings[q.id].after}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <ToneBadge tone={getChangeTone(r.avgChange)}>{formatChange(r.avgChange)}</ToneBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
