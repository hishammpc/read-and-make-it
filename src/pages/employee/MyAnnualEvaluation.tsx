import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Callout } from '@/components/common/Callout';
import { ScoreCard } from '@/components/common/ScoreCard';
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
  Lock,
  CalendarClock,
} from 'lucide-react';
import { RadarScoreChart } from '@/components/charts/RadarScoreChart';
import { useMyPendingAnnualEvaluations, useMyAllAnnualEvaluations } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { embeddedCycle, getCycleState } from '@/lib/annualCycle';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  calculateTotalScore,
  calculatePercentage,
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
  // "Latest" follows the same 2025-onward rule as the year list (2024 is demo data)
  const selectedEvaluation = selectedYear === 'latest'
    ? allEvaluations?.find((e) => (e.cycle as { year?: number } | null)?.year === availableYears[0])
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
  // Unfinished evaluation in a cycle that isn't open (closed, or not open yet)
  const selectedCycle = embeddedCycle(selectedEvaluation);
  const selectedCycleState = getCycleState(selectedCycle);
  const selectedNotOpen = !!selectedEvaluation && !isCompleted && !selectedCycleState.isOpen;

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
            variant="plain"
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

        {/* Unfinished, but the period is closed or hasn't opened yet */}
        {selectedNotOpen &&
          (selectedCycleState.phase === 'scheduled' ? (
            <Callout
              variant="plain"
              tone="info"
              icon={CalendarClock}
              title={t.employee.annual.scheduledTitle(selectedCycle?.year ?? '')}
              description={t.employee.annual.scheduledDescription(formatMalaysianDate(selectedCycle?.start_date ?? ''))}
            />
          ) : (
            <Callout
              variant="plain"
              tone="muted"
              icon={Lock}
              title={t.employee.annual.closedTitle(selectedCycle?.year ?? '')}
              description={
                isWaitingSupervisor
                  ? t.employee.annual.closedWaitingDescription
                  : t.employee.annual.closedStaffDescription
              }
            />
          ))}

        {/* Waiting for supervisor */}
        {isWaitingSupervisor && selectedEvaluation && !selectedNotOpen && (
          <Callout variant="plain" tone="info" icon={Clock} title={tm.waitingTitle} description={tm.waitingDescription}>
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
          score={{ total: staffTotal, percentage: staffPercentage }}
        />
        <ScoreCard
          label={ta.supervisorEvaluation}
          icon={UserCheck}
          tone="success"
          score={{ total: supervisorTotal, percentage: supervisorPercentage }}
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
            <RadarScoreChart
              data={radarData}
              series={[
                { dataKey: 'staff', label: ta.chartSelf },
                { dataKey: 'supervisor', label: ta.chartSupervisor },
              ]}
              max={5}
              formatValue={ta.level}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
