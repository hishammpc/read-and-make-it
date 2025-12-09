import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedAdminDashboard } from '@/hooks/useAdminDashboard';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Users,
  ClipboardCheck,
  FileText,
  AlertCircle,
  Loader2,
  Trophy,
  TrendingUp,
  Star,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const EVALUATION_QUESTIONS = [
  { id: 'q1', short: 'Objektif' },
  { id: 'q2', short: 'Pengetahuan' },
  { id: 'q3', short: 'Penjelasan' },
  { id: 'q4', short: 'Penglibatan' },
  { id: 'q5', short: 'Persembahan' },
  { id: 'q6', short: 'Keperluan MPC' },
  { id: 'q7', short: 'Kemahiran' },
  { id: 'q8', short: 'Cadangan' },
  { id: 'q9', short: 'Keseluruhan' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { data: stats, isLoading, error } = useEnhancedAdminDashboard(selectedYear);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 2.5) return 'text-green-600';
    if (score >= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Year Filter */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Training insights and analytics
            </p>
          </div>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {/* Extended years from 2023 to 2035 */}
              {Array.from({ length: 13 }, (_, i) => 2023 + i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load dashboard statistics. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && stats && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPrograms}</div>
                  <p className="text-xs text-muted-foreground">{selectedYear}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                  <p className="text-xs text-muted-foreground">Unique users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Training Hours</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalHours}</div>
                  <p className="text-xs text-muted-foreground">Total delivered</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button onClick={() => navigate('/dashboard/programs/new')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Program
                </Button>
                <Button variant="secondary" onClick={() => navigate('/admin/users/create')}>
                  <Users className="w-4 h-4 mr-2" />
                  Add User
                </Button>
                <Button variant="secondary" onClick={() => navigate('/dashboard/reports')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            {/* Monthly Trend Chart - Full Width */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Monthly Training Trend</CardTitle>
                </div>
                <CardDescription>Hours delivered per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Leaderboard & Evaluation Summary */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top 10 Leaderboard */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <CardTitle>Top 10 Leaderboard</CardTitle>
                  </div>
                  <CardDescription>Employees with most training hours</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {stats.leaderboard.length > 0 ? (
                      stats.leaderboard.map((entry) => (
                        <div
                          key={entry.userId}
                          className={cn(
                            'flex items-center gap-4 px-6 py-3',
                            entry.rank === 1 && 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500',
                            entry.rank === 2 && 'bg-slate-100 dark:bg-slate-800/50 border-l-4 border-slate-400',
                            entry.rank === 3 && 'bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-600',
                            entry.rank > 3 && 'border-l-4 border-transparent'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                            entry.rank === 1 && 'bg-amber-500 text-white',
                            entry.rank === 2 && 'bg-slate-400 text-white',
                            entry.rank === 3 && 'bg-orange-600 text-white',
                            entry.rank > 3 && 'bg-slate-200 dark:bg-slate-700 text-muted-foreground'
                          )}>
                            {entry.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{entry.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {entry.department}
                            </div>
                          </div>
                          <div className="text-right mr-2">
                            <div className="font-semibold">{entry.hoursCompleted}</div>
                            <div className="text-xs text-muted-foreground">hrs</div>
                          </div>
                          <CircularProgress
                            value={entry.compliancePercentage}
                            size={36}
                            strokeWidth={3}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-8 text-center text-muted-foreground">
                        No leaderboard data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    <CardTitle>Evaluation Summary</CardTitle>
                  </div>
                  <CardDescription>
                    Average scores from {stats.evaluationSummary?.totalResponses || 0} responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.evaluationSummary ? (
                    <div className="space-y-3">
                      {EVALUATION_QUESTIONS.map((q) => {
                        const score = stats.evaluationSummary?.[q.id as keyof typeof stats.evaluationSummary] as number || 0;
                        const percentage = (score / 3) * 100;
                        return (
                          <div key={q.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{q.short}</span>
                              <span className={cn('font-semibold', getScoreColor(score))}>
                                {score.toFixed(1)} / 3.0
                              </span>
                            </div>
                            <div className="relative h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all"
                                style={{
                                  width: `${percentage}%`,
                                  background: score >= 2.5
                                    ? '#22c55e'
                                    : score >= 1.5
                                      ? '#eab308'
                                      : '#ef4444',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-4 border-t mt-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Overall Average</span>
                          <span className={cn(
                            'text-lg font-bold',
                            getScoreColor(
                              Object.values(stats.evaluationSummary)
                                .filter((v): v is number => typeof v === 'number' && v <= 3)
                                .reduce((a, b) => a + b, 0) / 9
                            )
                          )}>
                            {(
                              Object.entries(stats.evaluationSummary)
                                .filter(([k]) => k.startsWith('q'))
                                .map(([, v]) => v as number)
                                .reduce((a, b) => a + b, 0) / 9
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No evaluation data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Overdue Evaluations */}
            {stats.overdueEvaluations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Overdue Evaluations</CardTitle>
                  <CardDescription>
                    Programs completed over 3 days ago without evaluation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.overdueEvaluations.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between pb-3 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {item.programs?.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Participant: {item.profiles?.name || item.profiles?.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Completed: {formatDate(item.programs?.end_date_time)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/dashboard/evaluations`)}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
