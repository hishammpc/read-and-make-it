import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { formatChange, getChangeTone } from '@/lib/evaluationForms';
import type { ProgramEvaluationSummary } from '@/hooks/useEvaluations';

/**
 * Master view for the before/after evaluation form (programs from 2027):
 * pooled headline numbers + average improvement per program, ranked.
 * Bars diverge from zero: improvement right (series blue), decline left (red).
 */
export function ImprovementOverview({ programs }: { programs: ProgramEvaluationSummary[] }) {
  const { t } = useLanguage();
  const te = t.adminTraining.evaluations;

  const v2Programs = programs.filter((p) => p.formVersion === 2);
  if (v2Programs.length === 0) return null;

  const withData = v2Programs
    .filter((p) => p.improvement)
    .map((p) => ({ ...p, improvement: p.improvement! }))
    .sort((a, b) => b.improvement.avgChange - a.improvement.avgChange);

  const header = (
    <CardHeader>
      <CardTitle>{te.overviewTitle}</CardTitle>
      <CardDescription>
        {te.overviewDescription(
          v2Programs.length,
          withData.reduce((n, p) => n + p.improvement.responses, 0)
        )}
      </CardDescription>
    </CardHeader>
  );

  if (withData.length === 0) {
    return (
      <Card>
        {header}
        <CardContent>
          <p className="text-sm text-muted-foreground">{te.noResponsesYet}</p>
        </CardContent>
      </Card>
    );
  }

  // Pool across programs, weighted by each program's number of responses
  const totalResponses = withData.reduce((n, p) => n + p.improvement.responses, 0);
  const weighted = (pick: (p: (typeof withData)[number]) => number) =>
    withData.reduce((sum, p) => sum + pick(p) * p.improvement.responses, 0) / totalResponses;
  const pooledBefore = weighted((p) => p.improvement.avgBefore);
  const pooledAfter = weighted((p) => p.improvement.avgAfter);
  const pooledChange = pooledAfter - pooledBefore;
  const pooledImproved = weighted((p) => p.improvement.improvedShare);

  // Symmetric domain around zero, at least ±1 point, rounded up to half a point
  const maxAbs = Math.max(1, ...withData.map((p) => Math.abs(p.improvement.avgChange)));
  const domain = Math.ceil(maxAbs * 2) / 2;
  const changeTone = getChangeTone(pooledChange);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={te.statBefore} value={pooledBefore.toFixed(1)} hint={te.scaleHint} tone="muted" />
        <StatCard label={te.statAfter} value={pooledAfter.toFixed(1)} hint={te.scaleHint} tone="primary" />
        <StatCard
          label={te.statChange}
          value={formatChange(pooledChange)}
          icon={changeTone === 'danger' ? ArrowDownRight : ArrowUpRight}
          tone={changeTone}
          hint={`${pooledBefore.toFixed(1)} → ${pooledAfter.toFixed(1)}`}
        />
        <StatCard
          label={te.statImproved}
          value={`${Math.round(pooledImproved * 100)}%`}
          icon={Users}
          tone="info"
          hint={te.statImprovedHint}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>{te.chartTitle}</CardTitle>
          </div>
          <CardDescription>{te.chartDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
            {withData.map((p) => {
              const change = p.improvement.avgChange;
              const width = (Math.abs(change) / domain) * 50; // % of the full track
              const positive = change >= 0;
              return (
                <li
                  key={p.programId}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_3.25rem] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
                  title={`${p.programTitle}: ${p.improvement.avgBefore.toFixed(1)} → ${p.improvement.avgAfter.toFixed(1)} (${p.improvement.responses})`}
                >
                  <Link
                    to={`/dashboard/programs/${p.programId}`}
                    className="truncate text-sm hover:text-primary hover:underline underline-offset-4"
                  >
                    {p.programTitle}
                  </Link>
                  <div className="relative h-3" aria-hidden="true">
                    <div className="absolute inset-y-[5px] left-0 right-0 rounded-full bg-muted" />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div
                      className={cn(
                        'absolute inset-y-0 rounded-full',
                        positive ? 'left-1/2 bg-chart-1' : 'right-1/2 bg-destructive'
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums">{formatChange(change)}</span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
