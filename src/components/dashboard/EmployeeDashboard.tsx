import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileCheck,
  Award,
  Clock,
  LogOut,
  TrendingUp,
} from 'lucide-react';

export default function EmployeeDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.userId || '');

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
          <div className="grid gap-4 md:grid-cols-3">
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
                  Pending Evaluations
                </CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingEvaluationsCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  To complete
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
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-24 flex-col"
              onClick={() => navigate('/dashboard/my-trainings')}
            >
              <BookOpen className="w-6 h-6 mb-2" />
              <span>My Trainings</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col"
              onClick={() => navigate('/dashboard/my-hours')}
            >
              <Clock className="w-6 h-6 mb-2" />
              <span>My Hours</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col"
              disabled
            >
              <Award className="w-6 h-6 mb-2" />
              <span>My Certificates</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
