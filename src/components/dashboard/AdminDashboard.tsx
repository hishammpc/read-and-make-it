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
} from 'recharts';
import { ChartTooltipBox } from '@/components/charts/ChartTooltipBox';
import { CHART_GRID_STROKE, CHART_TICK, SERIES_COLORS } from '@/components/charts/chartTheme';
import { cn } from '@/lib/utils';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { toneClasses } from '@/lib/status';


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
                {/* One series: no legend box (the card title names it); solid hairline grid */}
                <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="month" tick={CHART_TICK} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                  <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--border))' }}
                    content={({ active, payload, label }) =>
                      active && payload && payload.length > 0 ? (
                        <ChartTooltipBox
                          title={label}
                          rows={[
                            {
                              label: td.admin.trendSeries,
                              value: `${payload[0].value} ${t.common.hoursShort}`,
                              color: SERIES_COLORS[0],
                            },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    name={td.admin.trendSeries}
                    stroke={SERIES_COLORS[0]}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: SERIES_COLORS[0] }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top 10 leaderboard (full width) */}
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
