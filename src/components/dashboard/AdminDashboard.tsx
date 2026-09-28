import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedAdminDashboard } from '@/hooks/useAdminDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  Trophy,
  TrendingUp,
  Star,
} from 'lucide-react';
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
import { formatMalaysianDate } from '@/lib/dateUtils';
import { toneClasses, getComplianceTone, getTrainingScoreTone } from '@/lib/status';

// Short labels for the scored training-evaluation questions (current form, see
// EvaluationForm.tsx) — official BM content, not translated.
const EVALUATION_QUESTIONS = [
  { id: 'q1', short: 'Objektif' },
  { id: 'q2', short: 'Tenaga pengajar' },
  { id: 'q3', short: 'Bahan terkini' },
  { id: 'q4', short: 'Manfaat' },
  { id: 'q5', short: 'Wajar diteruskan' },
] as const;

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => 2023 + i);

/** Rank chip: #1 solid, #2–3 soft, the rest neutral. */
function rankChipClass(rank: number) {
  if (rank === 1) return toneClasses.primary.solid;
  if (rank <= 3) return toneClasses.primary.soft;
  return toneClasses.muted.soft;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const td = t.dashboard;
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { data: stats, isLoading, error } = useEnhancedAdminDashboard(selectedYear);

  if (isLoading) {
    return (
      <AdminLayout>
        <PageSkeleton variant="dashboard" />
      </AdminLayout>
    );
  }

  const header = (
    <PageHeader
      title={t.nav.dashboard}
      description={td.admin.description}
      actions={
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-28" aria-label={t.common.year}>
            <SelectValue placeholder={t.common.year} />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );

  // Month axis labels follow the UI language (the hook returns English abbreviations).
  const trendData = stats?.monthlyTrend.map((m) => ({
    ...m,
    month: t.common.months[m.monthNum - 1]?.slice(0, 3) ?? m.month,
  }));

  const summary = stats?.evaluationSummary;
  const overallAverage = summary?.overall ?? 0;

  return (
    <AdminLayout>
      {header}

      {error && <ErrorState message={error.message} className="mb-6" />}

      {stats && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={td.admin.totalPrograms}
              value={stats.totalPrograms}
              icon={BookOpen}
              hint={td.yearHint(selectedYear)}
            />
            <StatCard
              label={td.admin.totalParticipants}
              value={stats.totalParticipants}
              icon={Users}
              hint={td.admin.uniqueStaff(stats.uniqueUsers)}
            />
            <StatCard
              label={td.admin.trainingHours}
              value={stats.totalHours}
              icon={ClipboardCheck}
              hint={td.admin.hoursDelivered}
            />
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>{td.admin.quickActions}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/dashboard/programs/new')}>
                <BookOpen className="h-4 w-4" />
                {td.admin.createProgram}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/admin/users/create')}>
                <Users className="h-4 w-4" />
                {td.admin.addUser}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard/reports')}>
                <FileText className="h-4 w-4" />
                {td.admin.generateReport}
              </Button>
            </CardContent>
          </Card>

          {/* Monthly trend chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>{td.admin.trendTitle}</CardTitle>
              </div>
              <CardDescription>{td.admin.trendDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    name={td.admin.trendSeries}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leaderboard & evaluation summary */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top 10 leaderboard */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <CardTitle>{td.admin.leaderboardTitle}</CardTitle>
                </div>
                <CardDescription>{td.admin.leaderboardDescription}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {stats.leaderboard.length > 0 ? (
                  <ol className="divide-y">
                    {stats.leaderboard.map((entry) => (
                      <li key={entry.userId} className="flex items-center gap-4 px-6 py-3">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                            rankChipClass(entry.rank)
                          )}
                        >
                          {entry.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{entry.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{entry.department}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold tabular-nums">{entry.hoursCompleted}</div>
                          <div className="text-xs text-muted-foreground">{t.common.hours}</div>
                        </div>
                        <CircularProgress
                          value={entry.compliancePercentage}
                          size={36}
                          strokeWidth={3}
                          label={`${td.leaderboard.compliance} ${entry.compliancePercentage}%`}
                        />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState compact icon={Trophy} title={td.leaderboard.empty} />
                )}
              </CardContent>
            </Card>

            {/* Evaluation summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <CardTitle>{td.admin.evaluationTitle}</CardTitle>
                </div>
                <CardDescription>
                  {td.admin.evaluationDescription(summary?.totalResponses || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary ? (
                  <div className="space-y-3">
                    {EVALUATION_QUESTIONS.map((q) => {
                      const score = summary[q.id as keyof typeof summary] as number || 0;
                      const percentage = (score / 3) * 100;
                      return (
                        <div key={q.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{q.short}</span>
                            <span className="font-medium tabular-nums">{score.toFixed(1)} / 3.0</span>
                          </div>
                          <Progress
                            value={percentage}
                            aria-label={q.short}
                            className={cn('h-2', toneClasses[getTrainingScoreTone(score)].bar)}
                          />
                        </div>
                      );
                    })}
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <span className="font-medium">{td.admin.overallAverage}</span>
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-lg font-semibold tabular-nums',
                          toneClasses[getTrainingScoreTone(overallAverage)].soft
                        )}
                      >
                        {overallAverage.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <EmptyState compact icon={Star} title={td.admin.evaluationEmpty} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overdue evaluations */}
          {stats.overdueEvaluations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{td.admin.overdueTitle}</CardTitle>
                <CardDescription>{td.admin.overdueDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {stats.overdueEvaluations.map((item: any) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.programs?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {td.admin.participant(item.profiles?.name || item.profiles?.email)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {td.admin.ended(
                            item.programs?.end_date_time ? formatMalaysianDate(item.programs.end_date_time) : '—'
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/dashboard/evaluations`)}
                      >
                        {td.admin.review}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
