import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge, ToneBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  Eye,
  MinusCircle,
} from 'lucide-react';
import { useSuperviseeEvaluations } from '@/hooks/useAnnualEvaluations';
import { calculatePercentage, getRatingLabel } from '@/lib/annualEvaluationQuestions';
import { getRatingPercentageTone, getStatusTone } from '@/lib/status';

export default function SuperviseeEvaluations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const ts = t.employee.supervisees;
  const { data: evaluations, isLoading, error } = useSuperviseeEvaluations(user?.userId || '');

  // Extract unique years from evaluations
  const years = useMemo(() => {
    if (!evaluations) return [];
    const yearSet = new Set<number>();
    evaluations.forEach((e) => {
      const year = (e.cycle as any)?.year;
      if (year && year >= 2025) yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [evaluations]);

  const [selectedYear, setSelectedYear] = useState<string>('');

  // Set default year when years are available
  const effectiveYear = selectedYear || (years.length > 0 ? String(years[0]) : '');

  // Filter evaluations by selected year
  const filteredEvaluations = useMemo(() => {
    if (!evaluations || !effectiveYear) return [];
    return evaluations.filter((e) => String((e.cycle as any)?.year) === effectiveYear);
  }, [evaluations, effectiveYear]);

  // Counts by status for selected year
  const pendingStaffCount = filteredEvaluations.filter((e) => e.status === 'pending_staff').length;
  const pendingSupervisorCount = filteredEvaluations.filter((e) => e.status === 'pending_supervisor').length;
  const completedCount = filteredEvaluations.filter((e) => e.status === 'completed').length;

  const header = (
    <PageHeader
      title={ts.title}
      description={ts.description}
      actions={
        years.length > 0 && (
          <Select value={effectiveYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-36" aria-label={t.common.year}>
              <SelectValue placeholder={ts.selectYear} />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    />
  );

  if (error) {
    return (
      <EmployeeLayout>
        <PageHeader title={ts.title} description={ts.description} />
        <ErrorState message={(error as Error).message} />
      </EmployeeLayout>
    );
  }

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="dashboard" />
      </EmployeeLayout>
    );
  }

  // Sort: pending_supervisor first, then pending_staff, then completed
  const sortedEvaluations = [...filteredEvaluations].sort((a, b) => {
    const order = { pending_supervisor: 0, pending_staff: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  const statusLabels = t.status.annualEvaluation;

  return (
    <EmployeeLayout>
      {header}

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label={statusLabels.pending_staff}
            value={pendingStaffCount}
            icon={MinusCircle}
            tone={getStatusTone('annualEvaluation', 'pending_staff')}
            hint={ts.pendingStaffHint}
          />
          <StatCard
            label={statusLabels.pending_supervisor}
            value={pendingSupervisorCount}
            icon={Clock}
            tone={getStatusTone('annualEvaluation', 'pending_supervisor')}
            hint={ts.pendingSupervisorHint}
          />
          <StatCard
            label={statusLabels.completed}
            value={completedCount}
            icon={CheckCircle2}
            tone={getStatusTone('annualEvaluation', 'completed')}
            hint={ts.completedHint}
          />
        </div>

        {filteredEvaluations.length > 0 ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>{ts.listTitle}</CardTitle>
              <CardDescription>{ts.listDescription(effectiveYear)}</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ts.colName}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-right">{ts.colScore}</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{t.common.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEvaluations.map((evaluation) => {
                  const supervisorPercentage = evaluation.supervisor_answers
                    ? calculatePercentage(evaluation.supervisor_answers as Record<string, number>)
                    : null;
                  const name = (evaluation.profiles as any)?.name || '';

                  return (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <StatusBadge kind="annualEvaluation" status={evaluation.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {supervisorPercentage !== null ? (
                          <ToneBadge tone={getRatingPercentageTone(supervisorPercentage)} className="tabular-nums">
                            {supervisorPercentage}% · {getRatingLabel(supervisorPercentage).label}
                          </ToneBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {evaluation.status === 'pending_supervisor' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/dashboard/supervisee-evaluations/${(evaluation.cycle as any)?.id}/${evaluation.user_id}`
                              )
                            }
                            aria-label={ts.evaluateFor(name)}
                          >
                            {ts.evaluate}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                        {evaluation.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/dashboard/supervisee-evaluations/detail/${evaluation.id}`
                              )
                            }
                            aria-label={ts.viewFor(name)}
                          >
                            <Eye className="h-4 w-4" />
                            {t.common.view}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyState icon={Users} title={ts.emptyTitle} description={ts.emptyDescription} />
        )}
      </div>
    </EmployeeLayout>
  );
}
