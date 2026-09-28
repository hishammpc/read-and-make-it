import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge, ToneBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardCheck,
  Clock,
  User,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { useMyPendingAnnualEvaluations, useMyAllAnnualEvaluations } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { getRatingPercentageTone, toneClasses, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  calculateTotalScore,
  calculatePercentage,
  getRatingLabel,
} from '@/lib/annualEvaluationQuestions';

export default function MyAnnualEvaluation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const tm = t.employee.myAnnual;
  const [selectedYear, setSelectedYear] = useState<string>('latest');

  const { data: pendingEvaluations, isLoading: pendingLoading } = useMyPendingAnnualEvaluations(user?.userId || '');
  const { data: allEvaluations, isLoading: allLoading } = useMyAllAnnualEvaluations(user?.userId || '');

  const isLoading = pendingLoading || allLoading;

  // Get unique years from evaluations
  const availableYears = allEvaluations
    ? [...new Set(allEvaluations.map((e: any) => (e.cycle as any)?.year).filter(Boolean))]
        .filter((y) => y >= 2025)
        .sort((a, b) => b - a)
    : [];

  // Get the selected evaluation
  const selectedEvaluation = selectedYear === 'latest'
    ? allEvaluations?.[0]
    : allEvaluations?.find((e: any) => (e.cycle as any)?.year?.toString() === selectedYear);

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="detail" />
      </EmployeeLayout>
    );
  }

  // Check if there's a pending evaluation
  const hasPending = pendingEvaluations && pendingEvaluations.length > 0;
  const pendingEval = hasPending ? pendingEvaluations[0] : null;

  // Check evaluation status
  const isCompleted = selectedEvaluation?.status === 'completed';
  const isWaitingSupervisor = selectedEvaluation?.status === 'pending_supervisor';
  const waitingSupervisorName: string | undefined = (selectedEvaluation?.supervisor as any)?.name;

  return (
    <EmployeeLayout>
      <PageHeader
        title={tm.title}
        description={tm.description}
        actions={
          availableYears.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-36" aria-label={t.common.year}>
                <SelectValue placeholder={tm.selectYear} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">{tm.latest}</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      <div className="space-y-6">
        {/* Pending evaluation */}
        {hasPending && pendingEval && (
          <Callout
            tone="warning"
            icon={ClipboardCheck}
            title={tm.pendingTitle}
            description={tm.pendingDescription((pendingEval.cycle as any)?.year)}
            action={
              <Button onClick={() => navigate(`/dashboard/my-annual-evaluation/${(pendingEval.cycle as any)?.id}/submit`)}>
                {tm.start}
                <ChevronRight className="h-4 w-4" />
              </Button>
            }
          >
            <p className="text-sm text-muted-foreground">
              {tm.period(
                formatMalaysianDate((pendingEval.cycle as any)?.start_date),
                formatMalaysianDate((pendingEval.cycle as any)?.end_date)
              )}
            </p>
          </Callout>
        )}

        {/* Waiting for supervisor */}
        {isWaitingSupervisor && selectedEvaluation && (
          <Callout tone="info" icon={Clock} title={tm.waitingTitle} description={tm.waitingDescription}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <StatusBadge kind="annualEvaluation" status="pending_supervisor" />
              {waitingSupervisorName && (
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  {tm.supervisorName(waitingSupervisorName)}
                </span>
              )}
              {selectedEvaluation.staff_submitted_at && (
                <span>{t.employee.annual.submittedOn(formatMalaysianDate(selectedEvaluation.staff_submitted_at))}</span>
              )}
            </div>
          </Callout>
        )}

        {/* Completed evaluation results */}
        {isCompleted && selectedEvaluation && (
          <CompletedEvaluationView evaluation={selectedEvaluation} />
        )}

        {/* No evaluation yet */}
        {!hasPending && !selectedEvaluation && (
          <EmptyState icon={ClipboardCheck} title={tm.emptyTitle} description={tm.emptyDescription} />
        )}
      </div>
    </EmployeeLayout>
  );
}

/** Notice card (pending / waiting) with a tone-coloured icon chip — tokens only, dark-mode safe. */
function Callout({
  tone,
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  tone: StatusTone;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClasses[tone].soft)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
            {children && <div className="pt-2">{children}</div>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Card>
  );
}

/** Self / supervisor score summary: total out of 100, rating tier and percentage. */
function ScoreCard({
  label,
  icon,
  tone,
  total,
  percentage,
  hint,
}: {
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
  total: number;
  percentage: number;
  hint?: string;
}) {
  const rating = getRatingLabel(percentage);
  return (
    <StatCard
      label={label}
      icon={icon}
      tone={tone}
      value={
        <>
          {total}
          <span className="text-base font-normal text-muted-foreground">/100</span>
        </>
      }
      hint={hint}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge tone={getRatingPercentageTone(percentage)}>{rating.label}</ToneBadge>
        <span className="text-sm tabular-nums text-muted-foreground">{percentage}%</span>
      </div>
    </StatCard>
  );
}

// Component to show completed evaluation with spider chart
function CompletedEvaluationView({ evaluation }: { evaluation: any }) {
  const { t } = useLanguage();
  const tm = t.employee.myAnnual;
  const ta = t.employee.annual;

  const staffAnswers = (evaluation.staff_answers || {}) as Record<string, number>;
  const supervisorAnswers = (evaluation.supervisor_answers || {}) as Record<string, number>;

  const staffTotal = calculateTotalScore(staffAnswers);
  const staffPercentage = calculatePercentage(staffAnswers);
  const supervisorTotal = calculateTotalScore(supervisorAnswers);
  const supervisorPercentage = calculatePercentage(supervisorAnswers);

  // Prepare radar chart data (using tahap 1-5 instead of scores 2-10)
  const radarData = ANNUAL_EVALUATION_QUESTIONS.map((q) => ({
    subject: q.shortLabel,
    staff: staffAnswers[q.id] || 0,
    supervisor: supervisorAnswers[q.id] || 0,
    fullMark: 5,
  }));

  const supervisorName = (evaluation.supervisor as any)?.name;

  return (
    <>
      {/* Score summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard
          label={tm.yourSelfEvaluation}
          icon={User}
          tone="info"
          total={staffTotal}
          percentage={staffPercentage}
        />
        <ScoreCard
          label={ta.supervisorEvaluation}
          icon={UserCheck}
          tone="success"
          total={supervisorTotal}
          percentage={supervisorPercentage}
          hint={supervisorName ? tm.by(supervisorName) : undefined}
        />
      </div>

      {/* Spider chart (chart internals unchanged until phase 4) */}
      <Card>
        <CardHeader>
          <CardTitle>{tm.chartTitle((evaluation.cycle as any)?.year)}</CardTitle>
          <CardDescription>{ta.chartDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fontSize: 12, fontWeight: 'bold', fill: '#000000' }}
                  tickCount={6}
                />
                <Radar
                  name={ta.chartSelf}
                  dataKey="staff"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name={ta.chartSupervisor}
                  dataKey="supervisor"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip
                  content={({ payload, label }) => {
                    if (payload && payload.length > 0) {
                      return (
                        <div className="bg-white p-2 border rounded-lg shadow-lg text-sm">
                          <p className="font-semibold mb-1">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }}>
                              {entry.name}: {ta.level(entry.value)}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
