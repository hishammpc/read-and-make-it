import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyPendingAnnualEvaluations, usePendingSuperviseeCount, useMyAllAnnualEvaluations } from '@/hooks/useAnnualEvaluations';
import { useUserSupervisor } from '@/hooks/useSupervisors';
import { isProposalPeriodOpen } from '@/hooks/useProposedTrainings';
import { CircularProgress } from '@/components/ui/circular-progress';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import ProposedTrainingDialog from '@/components/employee/ProposedTrainingDialog';
import { useNavigate } from 'react-router-dom';
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
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { calculatePercentage, getRatingLabel } from '@/lib/annualEvaluationQuestions';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.userId || '', selectedYear);
  const { data: leaderboard } = useLeaderboard(user?.userId || '', selectedYear);
  const { data: pendingAnnualEvals } = useMyPendingAnnualEvaluations(user?.userId || '');
  const { data: pendingSuperviseeCount } = usePendingSuperviseeCount(user?.userId || '');
  const { data: supervisor } = useUserSupervisor(user?.userId || '');
  const { data: allAnnualEvals } = useMyAllAnnualEvaluations(user?.userId || '');
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  // Generate available years (current year and 4 previous years)
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const proposalPeriodOpen = isProposalPeriodOpen();

  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  if (error) {
    return (
      <EmployeeLayout>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load dashboard data'}
            </p>
          </CardContent>
        </Card>
      </EmployeeLayout>
    );
  }

  const progressPercentage = stats?.compliancePercentage || 0;
  const hoursCompleted = stats?.hoursThisYear || 0;
  const targetHours = stats?.targetHours || 40;

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome Back, {user?.name || 'User'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pending Annual Evaluation Alert */}
        {pendingAnnualEvals && pendingAnnualEvals.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg text-orange-800">Penilaian Tahunan</CardTitle>
              </div>
              <CardDescription className="text-orange-700">
                Sila lengkapkan penilaian kendiri anda untuk tahun {(pendingAnnualEvals[0].cycle as any)?.year}
                <br />
                <span className="text-orange-600 font-medium">Semak nama penyelia anda sebelum menjawab penilaian kendiri <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold animate-pulse">!</span></span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-sm text-orange-700">
                  Tempoh: {formatMalaysianDate((pendingAnnualEvals[0].cycle as any)?.start_date)} - {formatMalaysianDate((pendingAnnualEvals[0].cycle as any)?.end_date)}
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate(`/dashboard/my-annual-evaluation/${(pendingAnnualEvals[0].cycle as any)?.id}/submit`)}
                  className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
                >
                  Mula Penilaian
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Supervisee Evaluations Alert */}
        {pendingSuperviseeCount !== undefined && pendingSuperviseeCount > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-800">Penilaian Kakitangan Menunggu</CardTitle>
              </div>
              <CardDescription className="text-blue-700">
                {pendingSuperviseeCount} kakitangan di bawah penyeliaan anda memerlukan penilaian
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => navigate('/dashboard/supervisee-evaluations')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Lihat Senarai
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Light Bar */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Annual Training Progress</span>
              <span className="text-sm font-bold">{progressPercentage}%</span>
            </div>
            <div className="relative h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercentage}%`,
                  background: progressPercentage < 40
                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                    : progressPercentage < 70
                      ? 'linear-gradient(90deg, #f97316, #eab308)'
                      : 'linear-gradient(90deg, #eab308, #22c55e)',
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{hoursCompleted} hrs completed</span>
              <span>Target: {targetHours} hrs</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Training Hours
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hoursCompleted} hrs</div>
              <p className="text-xs text-muted-foreground">
                Year {selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compliance
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressPercentage}%</div>
              <p className="text-xs text-muted-foreground">
                Of annual target
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${
              (stats?.pendingEvaluationsCount || 0) > 0 ? 'ring-2 ring-orange-400' : ''
            }`}
            style={(stats?.pendingEvaluationsCount || 0) > 0 ? {
              animation: 'pulse-glow 1.5s ease-in-out infinite',
            } : undefined}
            onClick={() => navigate('/dashboard/my-trainings')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Evaluations
              </CardTitle>
              <FileCheck className={`h-4 w-4 ${(stats?.pendingEvaluationsCount || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(stats?.pendingEvaluationsCount || 0) > 0 ? 'text-orange-500' : ''}`}>
                {stats?.pendingEvaluationsCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {(stats?.pendingEvaluationsCount || 0) > 0 ? (
                  <>
                    From: {[...new Set(stats?.pendingEvaluations?.map((p: any) =>
                      new Date(p.programs?.end_date_time).getFullYear()
                    ))].sort((a, b) => b - a).join(', ')}
                  </>
                ) : (
                  'To complete'
                )}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/dashboard/my-trainings')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                My Trainings
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.trainingHistory?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Programs in {selectedYear}
              </p>
            </CardContent>
          </Card>

          {/* Propose Training Card - only visible during Dec 1 - Feb 28 */}
          {proposalPeriodOpen && (() => {
            const proposalYear = new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear();
            return (
              <Card
                className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/30 bg-primary/5"
                onClick={() => setShowProposalDialog(true)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Propose Training
                  </CardTitle>
                  <Send className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{proposalYear}</div>
                  <p className="text-xs text-muted-foreground">
                    Due: 28 Feb {proposalYear}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <CardTitle>Training Leaderboard {selectedYear}</CardTitle>
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
                      'flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 transition-colors',
                      entry.rank === 1 && 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500',
                      entry.rank === 2 && 'bg-slate-100 dark:bg-slate-800/50 border-l-4 border-slate-400',
                      entry.rank === 3 && 'bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-600',
                      entry.rank > 3 && 'border-l-4 border-transparent',
                      isCurrentUser && 'bg-primary/5 ring-1 ring-primary/20'
                    )}
                  >
                    {/* Rank */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                      entry.rank === 1 && 'bg-amber-500 text-white',
                      entry.rank === 2 && 'bg-slate-400 text-white',
                      entry.rank === 3 && 'bg-orange-600 text-white',
                      entry.rank > 3 && 'bg-slate-200 dark:bg-slate-700 text-muted-foreground'
                    )}>
                      {entry.rank}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'font-medium truncate',
                        isCurrentUser && 'text-primary font-semibold'
                      )}>
                        {entry.name}
                        {isCurrentUser && <span className="ml-2 text-xs text-primary">(You)</span>}
                      </div>
                    </div>

                    {/* Hours */}
                    <div className="text-right">
                      <div className={cn(
                        'font-semibold',
                        isTop3 && 'text-lg'
                      )}>
                        {entry.hoursCompleted}
                      </div>
                      <div className="text-xs text-muted-foreground">hrs</div>
                    </div>

                    {/* Progress Ring - hidden on mobile */}
                    <div className="hidden sm:block">
                      <CircularProgress
                        value={entry.compliancePercentage}
                        size={40}
                        strokeWidth={4}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Show current user if not in top 10 */}
              {leaderboard && !leaderboard.isCurrentUserInTopTen && leaderboard.currentUserEntry && (
                <>
                  <div className="px-3 sm:px-6 py-2 bg-slate-50 dark:bg-slate-800/50">
                    <div className="border-t border-dashed border-slate-300 dark:border-slate-600" />
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 bg-primary/5 ring-1 ring-inset ring-primary/20">
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-primary text-primary-foreground">
                      {leaderboard.currentUserEntry.rank}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-primary truncate">
                        {leaderboard.currentUserEntry.name}
                        <span className="ml-2 text-xs">(You)</span>
                      </div>
                    </div>

                    {/* Hours */}
                    <div className="text-right">
                      <div className="font-semibold">
                        {leaderboard.currentUserEntry.hoursCompleted}
                      </div>
                      <div className="text-xs text-muted-foreground">hrs</div>
                    </div>

                    {/* Progress Ring - hidden on mobile */}
                    <div className="hidden sm:block">
                      <CircularProgress
                        value={leaderboard.currentUserEntry.compliancePercentage}
                        size={40}
                        strokeWidth={4}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Empty state */}
              {(!leaderboard?.topTen || leaderboard.topTen.length === 0) && (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  No leaderboard data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Annual Evaluation History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-500" />
              <CardTitle>Sejarah Penilaian Tahunan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {allAnnualEvals && allAnnualEvals.filter((e: any) => (e.cycle as any)?.year >= 2025).length > 0 ? (
                allAnnualEvals.filter((e: any) => (e.cycle as any)?.year >= 2025).map((evalItem: any) => {
                  const status = evalItem.status;
                  const supervisorAnswers = (evalItem.supervisor_answers || {}) as Record<string, number>;
                  const isCompleted = status === 'completed';
                  const isPendingSupervisor = status === 'pending_supervisor';
                  const percentage = isCompleted
                    ? calculatePercentage(supervisorAnswers)
                    : 0;
                  const rating = isCompleted
                    ? getRatingLabel(percentage)
                    : null;

                  return (
                    <div
                      key={evalItem.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/dashboard/my-annual-evaluation/history/${evalItem.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          {(evalItem.cycle as any)?.year}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            isCompleted
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : isPendingSupervisor
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-orange-100 text-orange-700 border-orange-300'
                          }
                        >
                          {isCompleted
                            ? 'Selesai'
                            : isPendingSupervisor
                            ? 'Menunggu Penyelia'
                            : 'Belum Mula'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        {rating && (
                          <span className="text-sm text-muted-foreground">
                            {percentage}% - {rating.label}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  Tiada sejarah penilaian tahunan
                </div>
              )}
            </div>
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
