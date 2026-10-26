import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { YEAR_OPTIONS } from '@/lib/period';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { getComplianceTone, toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Clock, Hourglass, Target } from 'lucide-react';

const FILTER_DEFAULTS = { year: String(new Date().getFullYear()) };

export default function MyHours() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const th = t.employee.myHours;
  const { filters, setFilters } = useUrlFilters(FILTER_DEFAULTS);
  const selectedYear = parseInt(filters.year);
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.userId || '', selectedYear);

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="dashboard" />
      </EmployeeLayout>
    );
  }

  const header = (
    <PageHeader
      title={th.title}
      description={th.description}
      actions={
        <Select value={filters.year} onValueChange={(year) => setFilters({ year })}>
          <SelectTrigger className="w-28" aria-label={t.common.year}>
            <SelectValue placeholder={t.common.year} />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((year) => (
              <SelectItem key={year} value={year}>
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

  const hoursCompleted = stats?.hoursThisYear || 0;
  const targetHours = stats?.targetHours || 40;
  const progressPercentage = stats?.compliancePercentage || 0;
  const hoursRemaining = Math.max(0, targetHours - hoursCompleted);
  const tone = getComplianceTone(progressPercentage);
  const programs = [...(stats?.trainingHistory || [])].sort(
    (a, b) => Date.parse(a.programs?.start_date_time) - Date.parse(b.programs?.start_date_time)
  );

  return (
    <EmployeeLayout>
      {header}

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label={th.completed}
            value={t.employee.shared.hours(hoursCompleted)}
            icon={Clock}
            tone={tone}
            hint={th.yearHint(selectedYear)}
          />
          <StatCard
            label={th.target}
            value={t.employee.shared.hours(targetHours)}
            icon={Target}
            tone="primary"
            hint={th.targetHint}
          />
          <StatCard
            label={th.remaining}
            value={t.employee.shared.hours(hoursRemaining)}
            icon={Hourglass}
            tone="muted"
            hint={th.remainingHint}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{th.progressTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{th.progressLabel}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{progressPercentage}%</span>
              </div>
              <Progress
                value={progressPercentage}
                aria-label={th.progressLabel}
                className={cn('h-3', toneClasses[tone].bar)}
              />
            </div>
            <p className="text-sm text-muted-foreground">{th.progressSummary(hoursCompleted, targetHours)}</p>
          </CardContent>
        </Card>

        {/* The programs behind the total, in date order */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{th.programsTitle}</CardTitle>
            <CardDescription>{th.programsDescription(selectedYear)}</CardDescription>
          </CardHeader>
          {programs.length === 0 ? (
            <CardContent>
              <p className="text-sm text-muted-foreground">{th.noPrograms}</p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.employee.myTrainings.colProgram}</TableHead>
                  <TableHead>{t.employee.myTrainings.colStart}</TableHead>
                  <TableHead className="text-right">{t.employee.myTrainings.colHours}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.programs?.title}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatMalaysianDate(assignment.programs?.start_date_time)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {assignment.programs?.hours || 0} {t.common.hoursShort}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </EmployeeLayout>
  );
}
