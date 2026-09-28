import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CircularProgress } from '@/components/ui/circular-progress';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyPendingAnnualEvaluations, usePendingSuperviseeCount, useMyAllAnnualEvaluations } from '@/hooks/useAnnualEvaluations';
import { useUserSupervisor } from '@/hooks/useSupervisors';
import { useProposalPeriod } from '@/hooks/useSystemSettings';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import ProposedTrainingDialog from '@/components/employee/ProposedTrainingDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Callout } from '@/components/common/Callout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  FileCheck,
  Clock,
  TrendingUp,
  Trophy,
  ClipboardCheck,
  Users,
  ChevronRight,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { toneClasses, getComplianceTone } from '@/lib/status';
import { calculatePercentage, getRatingLabel } from '@/lib/annualEvaluationQuestions';

/** Rank chip: #1 solid, #2–3 soft, the rest neutral. */
function rankChipClass(rank: number) {
  if (rank === 1) return toneClasses.primary.solid;
  if (rank <= 3) return toneClasses.primary.soft;
  return toneClasses.muted.soft;
}

/** Calm attention cue for pending items: a warning dot with a soft halo (stilled under reduced motion). */
function AttentionDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative flex h-2.5 w-2.5 shrink-0', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
    </span>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const td = t.dashboard;
  const ts = td.staff;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.userId || '', selectedYear);
  const { data: leaderboard } = useLeaderboard(user?.userId || '', selectedYear);
  const { data: pendingAnnualEvals } = useMyPendingAnnualEvaluations(user?.userId || '');
  const { data: pendingSuperviseeCount } = usePendingSuperviseeCount(user?.userId || '');
  const { data: supervisor } = useUserSupervisor(user?.userId || '');
  const { data: allAnnualEvals } = useMyAllAnnualEvaluations(user?.userId || '');
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const { isOpen: proposalPeriodOpen, proposalYear, endDate: proposalEndDate } = useProposalPeriod();

  // Generate available years (current year and 4 previous years)
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="dashboard" />
      </EmployeeLayout>
    );
  }

  const header = (
    <PageHeader
      title={user?.name ? ts.greeting(user.name) : t.auth.welcome}
      description={ts.description}
      actions={
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-28" aria-label={t.common.year}>
            <SelectValue placeholder={t.common.year} />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );

  if (error) {
    return (
      <EmployeeLayout>
        {header}
        <ErrorState message={error instanceof Error ? error.message : undefined} />
      </EmployeeLayout>
    );
  }

  const progressPercentage = stats?.compliancePercentage || 0;
  const hoursCompleted = stats?.hoursThisYear || 0;
  const targetHours = stats?.targetHours || 40;
  const complianceTone = getComplianceTone(progressPercentage);

  const pendingCount = stats?.pendingEvaluationsCount || 0;
  const hasPending = pendingCount > 0;

  const pendingCycle = pendingAnnualEvals?.[0]?.cycle as any;
  const history = (allAnnualEvals || []).filter((e: any) => (e.cycle as any)?.year >= 2025);

  return (
    <EmployeeLayout>
      {header}

      <div className="space-y-6">
        {/* Pending annual evaluation */}
        {pendingAnnualEvals && pendingAnnualEvals.length > 0 && (
          <Callout
            tone="warning"
            icon={ClipboardCheck}
            title={ts.annualEval.title}
            action={
              <Button
                size="sm"
                onClick={() => navigate(`/dashboard/my-annual-evaluation/${pendingCycle?.id}/submit`)}
                className="w-full sm:w-auto"
              >
                {ts.annualEval.start}
                <ChevronRight className="h-4 w-4" />
              </Button>
            }
          >
            <p>{ts.annualEval.description(pendingCycle?.year)}</p>
            <p className="flex items-center gap-2 font-medium">
              <AttentionDot />
              {ts.annualEval.checkSupervisor}
            </p>
            {/* undefined = still loading; null = no supervisor set */}
            {supervisor !== undefined && (
              <p>
                {supervisor?.name
                  ? ts.annualEval.supervisorName(supervisor.name)
                  : ts.annualEval.noSupervisor}
              </p>
            )}
            <p className="opacity-80">
              {ts.annualEval.period(
                formatMalaysianDate(pendingCycle?.start_date),
                formatMalaysianDate(pendingCycle?.end_date)
              )}
            </p>
          </Callout>
        )}

        {/* Pending supervisee evaluations */}
        {pendingSuperviseeCount !== undefined && pendingSuperviseeCount > 0 && (
          <Callout
            tone="info"
            icon={Users}
            title={ts.supervisee.title}
            action={
              <Button
                size="sm"
                onClick={() => navigate('/dashboard/supervisee-evaluations')}
                className="w-full sm:w-auto"
              >
                {ts.supervisee.view}
                <ChevronRight className="h-4 w-4" />
              </Button>
            }
          >
            <p>{ts.supervisee.description(pendingSuperviseeCount)}</p>
          </Callout>
        )}

        {/* Propose training - only during the open proposal period */}
        {proposalPeriodOpen && (
          <Callout
            tone="primary"
            icon={Send}
            title={ts.proposalOpen.title(proposalYear)}
            action={
              <Button size="sm" onClick={() => setShowProposalDialog(true)} className="w-full sm:w-auto">
                {ts.proposalOpen.action}
                <ChevronRight className="h-4 w-4" />
              </Button>
            }
          >
            {proposalEndDate && <p>{ts.proposalOpen.due(formatMalaysianDate(proposalEndDate))}</p>}
          </Callout>
        )}

        {/* Annual progress */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{ts.progressTitle}</span>
              <span className="text-sm font-semibold tabular-nums">{progressPercentage}%</span>
            </div>
            <Progress
              value={progressPercentage}
              aria-label={ts.progressTitle}
              className={cn('h-3', toneClasses[complianceTone].bar)}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{ts.hoursCompleted(hoursCompleted)}</span>
              <span>{ts.target(targetHours)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={ts.trainingHours}
            value={hoursCompleted}
            icon={Clock}
            hint={td.yearHint(selectedYear)}
          />
          <StatCard
            label={ts.compliance}
            value={`${progressPercentage}%`}
            icon={TrendingUp}
            tone={complianceTone}
            hint={ts.ofTarget}
          />
          <div className="relative">
            <StatCard
              label={ts.pendingEvaluations}
              value={pendingCount}
              icon={FileCheck}
              tone={hasPending ? 'warning' : 'primary'}
              hint={
                hasPending
                  ? ts.pendingFrom(
                      [...new Set(stats?.pendingEvaluations?.map((p: any) =>
                        new Date(p.programs?.end_date_time).getFullYear()
                      ))].sort((a, b) => b - a).join(', ')
                    )
                  : ts.noPending
              }
              onClick={() => navigate('/dashboard/my-trainings')}
              className={cn('h-full', hasPending && 'border-warning/50')}
            />
            {hasPending && <AttentionDot className="pointer-events-none absolute -right-1 -top-1" />}
          </div>
          <StatCard
            label={ts.myTrainings}
            value={stats?.trainingHistory?.length || 0}
            icon={BookOpen}
            hint={ts.programsInYear(selectedYear)}
            onClick={() => navigate('/dashboard/my-trainings')}
          />
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle>{ts.leaderboardTitle(selectedYear)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaderboard?.topTen.map((entry) => {
                const isTop3 = entry.rank <= 3;
                const isCurrentUser = entry.userId === user?.userId;

                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      'flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6',
                      isCurrentUser && 'bg-primary/5 ring-1 ring-inset ring-primary/20'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                        rankChipClass(entry.rank)
                      )}
                    >
                      {entry.rank}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className={cn('truncate font-medium', isCurrentUser && 'font-semibold text-primary')}>
                        {entry.name}
                        {isCurrentUser && <span className="ml-2 text-xs">{td.leaderboard.you}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={cn('font-semibold tabular-nums', isTop3 && 'text-lg')}>
                        {entry.hoursCompleted}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.common.hours}</div>
                    </div>

                    {/* Compliance ring - hidden on mobile */}
                    <CircularProgress
                      value={entry.compliancePercentage}
                      size={40}
                      strokeWidth={4}
                      className="hidden sm:inline-flex"
                      label={`${td.leaderboard.compliance} ${entry.compliancePercentage}%`}
                    />
                  </div>
                );
              })}

              {/* Show current user if not in top 10 */}
              {leaderboard && !leaderboard.isCurrentUserInTopTen && leaderboard.currentUserEntry && (
                <>
                  <div className="bg-muted/50 px-3 py-2 sm:px-6">
                    <div className="border-t border-dashed" />
                  </div>
                  <div className="flex items-center gap-2 bg-primary/5 px-3 py-3 ring-1 ring-inset ring-primary/20 sm:gap-4 sm:px-6">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                        toneClasses.primary.solid
                      )}
                    >
                      {leaderboard.currentUserEntry.rank}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-primary">
                        {leaderboard.currentUserEntry.name}
                        <span className="ml-2 text-xs">{td.leaderboard.you}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold tabular-nums">
                        {leaderboard.currentUserEntry.hoursCompleted}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.common.hours}</div>
                    </div>

                    <CircularProgress
                      value={leaderboard.currentUserEntry.compliancePercentage}
                      size={40}
                      strokeWidth={4}
                      className="hidden sm:inline-flex"
                      label={`${td.leaderboard.compliance} ${leaderboard.currentUserEntry.compliancePercentage}%`}
                    />
                  </div>
                </>
              )}

              {(!leaderboard?.topTen || leaderboard.topTen.length === 0) && (
                <EmptyState compact icon={Trophy} title={td.leaderboard.empty} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Annual evaluation history */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <CardTitle>{ts.historyTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {history.length > 0 ? (
              <div className="divide-y">
                {history.map((evalItem: any) => {
                  const isCompleted = evalItem.status === 'completed';
                  const supervisorAnswers = (evalItem.supervisor_answers || {}) as Record<string, number>;
                  const percentage = isCompleted ? calculatePercentage(supervisorAnswers) : 0;
                  // Rating label is official BM content — not translated.
                  const rating = isCompleted ? getRatingLabel(percentage) : null;

                  return (
                    <Link
                      key={evalItem.id}
                      to={`/dashboard/my-annual-evaluation/history/${evalItem.id}`}
                      className="flex flex-col justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:px-6"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold tabular-nums">{evalItem.cycle?.year}</span>
                        <StatusBadge kind="annualEvaluation" status={evalItem.status} />
                      </div>
                      <div className="flex items-center gap-3">
                        {rating && (
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {percentage}% · {rating.label}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState compact icon={ClipboardCheck} title={ts.historyEmpty} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Proposed Training Dialog */}
      <ProposedTrainingDialog
        open={showProposalDialog}
        onOpenChange={setShowProposalDialog}
      />
    </EmployeeLayout>
  );
}
