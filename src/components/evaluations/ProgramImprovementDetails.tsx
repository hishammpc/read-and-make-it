import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChartTooltipBox } from '@/components/charts/ChartTooltipBox';
import { OUTCOME_COLORS } from '@/components/charts/chartTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  SKILL_CHANGES,
  V2_ANALYSIS_QUESTION,
  V2_SCALE,
  percentOf,
  type SkillChangeSummary,
} from '@/lib/evaluationForms';

const scaleLabel = (value: number) => V2_SCALE.find((s) => s.value === value)?.label ?? '';

/**
 * One program's results on the before/after form, analysed on question 2 only (MPC's rule):
 * donut + figures (participants, respondents, improved / no change / declined), then each
 * staff member's own question-2 rating. Same layout as the old form: chart left, figures right.
 */
export function ProgramImprovementDetails({
  summary,
  totalAssigned,
  staffNames,
}: {
  summary: SkillChangeSummary;
  totalAssigned: number;
  /** user id → name (from the program's assignments) */
  staffNames: Record<string, string>;
}) {
  const { t } = useLanguage();
  const td = t.adminTraining.programDetails;
  const labels = t.status.skillChange;

  const outcomes = SKILL_CHANGES.map((change) => ({
    change,
    label: labels[change],
    count: summary.counts[change],
    percent: percentOf(summary.counts[change], summary.responses),
  }));
  const improvedPercent = outcomes[0].percent;

  const respondents = [...summary.respondents].sort(
    (a, b) =>
      SKILL_CHANGES.indexOf(a.change) - SKILL_CHANGES.indexOf(b.change) ||
      (staffNames[a.userId] || '').localeCompare(staffNames[b.userId] || '')
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        {/* Donut: share of respondents per outcome */}
        <div
          className="relative h-64"
          role="img"
          aria-label={outcomes.map((o) => `${o.label} ${td.peopleShare(o.count, o.percent)}`).join(', ')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={outcomes.filter((o) => o.count > 0)}
                dataKey="count"
                nameKey="label"
                innerRadius="64%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {outcomes
                  .filter((o) => o.count > 0)
                  .map((o) => (
                    <Cell key={o.change} fill={OUTCOME_COLORS[o.change]} />
                  ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  const outcome = active ? (payload?.[0]?.payload as (typeof outcomes)[number] | undefined) : undefined;
                  return outcome ? (
                    <ChartTooltipBox
                      rows={[
                        {
                          label: outcome.label,
                          value: td.peopleShare(outcome.count, outcome.percent),
                          color: OUTCOME_COLORS[outcome.change],
                        },
                      ]}
                    />
                  ) : null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight">{improvedPercent}%</span>
            <span className="text-sm text-muted-foreground">{td.improvedCenter}</span>
          </div>
        </div>

        {/* Figures */}
        <section className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">{td.analysisTitle}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {V2_ANALYSIS_QUESTION.short}: {V2_ANALYSIS_QUESTION.text}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs font-medium text-muted-foreground">{td.participants}</dt>
              <dd className="mt-0.5 text-lg font-semibold">{td.people(totalAssigned)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs font-medium text-muted-foreground">{td.respondents}</dt>
              <dd className="mt-0.5 text-lg font-semibold">{td.people(summary.responses)}</dd>
            </div>
          </dl>
          <ul className="space-y-3">
            {outcomes.map((o) => (
              <li key={o.change} className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-[3px]"
                      style={{ backgroundColor: OUTCOME_COLORS[o.change] }}
                    />
                    {o.label}
                  </span>
                  <span className="font-semibold tabular-nums">{td.peopleShare(o.count, o.percent)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${o.percent}%`, backgroundColor: OUTCOME_COLORS[o.change] }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{td.analysisNote}</p>
        </section>
      </div>

      {/* By staff member: own question-2 rating before → after */}
      <section>
        <h4 className="mb-2 text-sm font-medium text-muted-foreground">{td.byStaff}</h4>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td.colStaff}</TableHead>
                <TableHead>{td.before}</TableHead>
                <TableHead>{td.after}</TableHead>
                <TableHead className="text-right">{t.common.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {respondents.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="font-medium">{staffNames[r.userId] || '—'}</TableCell>
                  {[r.before, r.after].map((value, index) => (
                    <TableCell key={index} className="whitespace-nowrap text-sm">
                      <span className="tabular-nums">{value}</span>{' '}
                      <span className="text-muted-foreground">{scaleLabel(value)}</span>
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <StatusBadge kind="skillChange" status={r.change} />
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
