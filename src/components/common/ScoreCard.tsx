import type { LucideIcon } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge, ToneBadge } from '@/components/common/StatusBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { getRatingLabel } from '@/lib/annualEvaluationQuestions';
import { getRatingPercentageTone, type StatusTone } from '@/lib/status';

interface ScoreCardProps {
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
  /** null while that side hasn't submitted yet. */
  score: { total: number; percentage: number; submittedAt?: string | null } | null;
  /** Shown as a status badge when `score` is null. */
  pendingStatus?: 'pending_staff' | 'pending_supervisor';
  /** Overrides the default "submitted on …" hint. */
  hint?: string;
}

/** Annual-evaluation score summary: total /100, official rating tier and percentage. */
export function ScoreCard({ label, icon, tone, score, pendingStatus, hint }: ScoreCardProps) {
  const { t } = useLanguage();

  if (!score) {
    return (
      <StatCard label={label} icon={icon} tone="muted" value="—">
        {pendingStatus && <StatusBadge kind="annualEvaluation" status={pendingStatus} />}
      </StatCard>
    );
  }

  const rating = getRatingLabel(score.percentage);
  const defaultHint = score.submittedAt
    ? t.employee.annual.submittedOn(formatMalaysianDate(score.submittedAt))
    : undefined;

  return (
    <StatCard
      label={label}
      icon={icon}
      tone={tone}
      value={
        <>
          {score.total}
          <span className="text-base font-normal text-muted-foreground">/100</span>
        </>
      }
      hint={hint ?? defaultHint}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Rating words are official BM content */}
        <ToneBadge tone={getRatingPercentageTone(score.percentage)}>{rating.label}</ToneBadge>
        <span className="text-sm tabular-nums text-muted-foreground">{score.percentage}%</span>
      </div>
    </StatCard>
  );
}
