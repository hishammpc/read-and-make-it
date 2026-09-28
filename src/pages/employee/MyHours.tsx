import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getComplianceTone, toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Clock, Hourglass, Target } from 'lucide-react';

export default function MyHours() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const th = t.employee.myHours;
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.userId || '');

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="dashboard" />
      </EmployeeLayout>
    );
  }

  const header = <PageHeader title={th.title} description={th.description} />;

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
            hint={th.completedHint(new Date().getFullYear())}
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
      </div>
    </EmployeeLayout>
  );
}
