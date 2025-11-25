import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { CircularProgress } from '@/components/ui/circular-progress';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileCheck,
  Clock,
  LogOut,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmployeeDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.userId || '');
  const { data: leaderboard } = useLeaderboard(user?.userId || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      </div>
    );
  }

  const progressPercentage = stats?.compliancePercentage || 0;
  const hoursCompleted = stats?.hoursThisYear || 0;
  const targetHours = stats?.targetHours || 40;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-semibold">MyLearning Pro</h1>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome Back, {user?.name || 'User'}
            </h2>
            <p className="text-muted-foreground">
              Here's your training overview
            </p>
          </div>

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
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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
                  This year
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
                  To complete
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
                  Assigned programs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <CardTitle>Training Leaderboard</CardTitle>
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
                        'flex items-center gap-4 px-6 py-3 transition-colors',
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
                        <div className="text-xs text-muted-foreground truncate">
                          {entry.department}
                        </div>
                      </div>

                      {/* Hours */}
                      <div className="text-right mr-2">
                        <div className={cn(
                          'font-semibold',
                          isTop3 && 'text-lg'
                        )}>
                          {entry.hoursCompleted}
                        </div>
                        <div className="text-xs text-muted-foreground">hrs</div>
                      </div>

                      {/* Progress Ring */}
                      <CircularProgress
                        value={entry.compliancePercentage}
                        size={40}
                        strokeWidth={4}
                      />
                    </div>
                  );
                })}

                {/* Show current user if not in top 10 */}
                {leaderboard && !leaderboard.isCurrentUserInTopTen && leaderboard.currentUserEntry && (
                  <>
                    <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/50">
                      <div className="border-t border-dashed border-slate-300 dark:border-slate-600" />
                    </div>
                    <div className="flex items-center gap-4 px-6 py-3 bg-primary/5 ring-1 ring-inset ring-primary/20">
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
                        <div className="text-xs text-muted-foreground truncate">
                          {leaderboard.currentUserEntry.department}
                        </div>
                      </div>

                      {/* Hours */}
                      <div className="text-right mr-2">
                        <div className="font-semibold">
                          {leaderboard.currentUserEntry.hoursCompleted}
                        </div>
                        <div className="text-xs text-muted-foreground">hrs</div>
                      </div>

                      {/* Progress Ring */}
                      <CircularProgress
                        value={leaderboard.currentUserEntry.compliancePercentage}
                        size={40}
                        strokeWidth={4}
                      />
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
        </div>
      </main>
    </div>
  );
}
