import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileCheck,
  Award,
  Clock,
  LogOut,
  Calendar,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

export default function EmployeeDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.id || '');

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
              Welcome Back!
            </h2>
            <p className="text-muted-foreground">
              Here's your training overview
            </p>
          </div>

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

          {/* My Next Program */}
          <Card>
            <CardHeader>
              <CardTitle>My Next Program</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.nextProgram ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold text-lg">{stats.nextProgram.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{stats.nextProgram.category}</Badge>
                        <span>{stats.nextProgram.hours} hours</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(stats.nextProgram.start_date_time), 'MMM dd, yyyy • h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No upcoming programs scheduled
                </p>
              )}
            </CardContent>
          </Card>

          {/* Annual Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Annual Training Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                {hoursCompleted} of {targetHours} hours completed
              </p>
            </CardContent>
          </Card>

          {/* Hours by Category */}
          {stats?.hoursByCategory && Object.keys(stats.hoursByCategory).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Hours by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.hoursByCategory)
                    .filter(([_, hours]) => hours > 0)
                    .map(([category, hours]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">{hours} hrs</span>
                      </div>
                    ))}
                  {Object.values(stats.hoursByCategory).every(h => h === 0) && (
                    <p className="text-sm text-muted-foreground">No training hours recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
