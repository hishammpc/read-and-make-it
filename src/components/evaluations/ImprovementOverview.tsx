import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Minus, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { OUTCOME_COLORS } from '@/components/charts/chartTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStatusTone } from '@/lib/status';
import { SKILL_CHANGES, countSkillChanges, percentOf, type SkillChange } from '@/lib/evaluationForms';
import type { ProgramEvaluationSummary } from '@/hooks/useEvaluations';

const OUTCOME_ICONS = { improved: ArrowUpRight, unchanged: Minus, declined: ArrowDownRight };

/**
 * Master view for the before/after evaluation form (programs from 2027), analysed on
 * question 2 only: pooled outcome shares, then each program as a 100% stacked bar
 * (improved / no change / declined), ranked by share improved.
 */
export function ImprovementOverview({ programs }: { programs: ProgramEvaluationSummary[] }) {
  const { t } = useLanguage();
  const te = t.adminTraining.evaluations;
  const td = t.adminTraining.programDetails;
  const labels = t.status.skillChange;

  const v2Programs = programs.filter((p) => p.formVersion === 2);
  if (v2Programs.length === 0) return null;

  const withData = v2Programs
    .filter((p) => p.improvement)
    .map((p) => ({
      ...p,
      improvement: p.improvement!,
      improvedPercent: percentOf(p.improvement!.counts.improved, p.improvement!.responses),
    }))
    .sort((a, b) => b.improvedPercent - a.improvedPercent || b.improvement.responses - a.improvement.responses);

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

  // Pool across programs: every respondent counts once
  const respondents = withData.flatMap((p) => p.improvement.respondents);
  const counts = countSkillChanges(respondents);
  const participants = v2Programs.reduce((n, p) => n + p.totalAssigned, 0);

  const breakdown = (pCounts: Record<SkillChange, number>, total: number) =>
    SKILL_CHANGES.map((c) => `${labels[c]} ${td.peopleShare(pCounts[c], percentOf(pCounts[c], total))}`).join(' · ');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={te.statResponses}
          value={respondents.length}
          icon={ClipboardCheck}
          tone="info"
          hint={te.ofParticipants(participants)}
        />
        {SKILL_CHANGES.map((c) => (
          <StatCard
            key={c}
            label={labels[c]}
            value={`${percentOf(counts[c], respondents.length)}%`}
            icon={OUTCOME_ICONS[c]}
            tone={getStatusTone('skillChange', c)}
            hint={td.people(counts[c])}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>{te.chartTitle}</CardTitle>
          </div>
          <CardDescription>{te.chartDescription}</CardDescription>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm">
            {SKILL_CHANGES.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: OUTCOME_COLORS[c] }} />
                <span className="text-muted-foreground">{labels[c]}</span>
              </li>
            ))}
          </ul>
        </CardHeader>
        <CardContent>
          <ol className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
            {withData.map((p) => (
              <li
                key={p.programId}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_3.25rem] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
                title={`${p.programTitle}: ${breakdown(p.improvement.counts, p.improvement.responses)}`}
              >
                <Link
                  to={`/dashboard/programs/${p.programId}`}
                  className="truncate text-sm hover:text-primary hover:underline underline-offset-4"
                >
                  {p.programTitle}
                </Link>
                <div
                  className="flex h-3 gap-0.5 overflow-hidden rounded"
                  role="img"
                  aria-label={breakdown(p.improvement.counts, p.improvement.responses)}
                >
                  {SKILL_CHANGES.filter((c) => p.improvement.counts[c] > 0).map((c) => (
                    <div
                      key={c}
                      className="h-full basis-0"
                      style={{ flexGrow: p.improvement.counts[c], backgroundColor: OUTCOME_COLORS[c] }}
                    />
                  ))}
                </div>
                <span className="text-right text-sm font-semibold tabular-nums">{p.improvedPercent}%</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
