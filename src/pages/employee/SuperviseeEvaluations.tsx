import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge, ToneBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { Input } from '@/components/ui/input';
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
  Lock,
  Search,
} from 'lucide-react';
import { useSuperviseeEvaluations } from '@/hooks/useAnnualEvaluations';
import { Notice } from '@/components/common/Callout';
import { embeddedCycle, getCycleState } from '@/lib/annualCycle';
import { calculatePercentage, getRatingLabel } from '@/lib/annualEvaluationQuestions';
import { getRatingPercentageTone, getStatusTone } from '@/lib/status';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useTableSort } from '@/hooks/useTableSort';
import { useReturnState } from '@/hooks/useReturnTo';
import type { SortAccessors } from '@/lib/sort';

type SuperviseeEvaluation = NonNullable<ReturnType<typeof useSuperviseeEvaluations>['data']>[number];
type Profile = { name?: string; position?: string | null } | null | undefined;
const profileOf = (e: SuperviseeEvaluation) => e.profiles as unknown as Profile;

/** year '' = the latest year with evaluations */
const FILTER_DEFAULTS = { year: '', q: '', status: 'all' };

// Waiting for you first, then waiting for the staff member, then done
const STATUS_ORDER: Record<string, number> = { pending_supervisor: 0, pending_staff: 1, completed: 2 };

const SUPERVISEE_SORT: SortAccessors<SuperviseeEvaluation, 'name' | 'position' | 'status' | 'score'> = {
  name: (e) => profileOf(e)?.name,
  position: (e) => profileOf(e)?.position,
  status: (e) => STATUS_ORDER[e.status] ?? 3,
  score: (e) => (e.supervisor_answers ? calculatePercentage(e.supervisor_answers as Record<string, number>) : null),
};

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

  const { filters, setFilters } = useUrlFilters(FILTER_DEFAULTS);
  const returnState = useReturnState();
  const setSelectedYear = (year: string) => setFilters({ year });

  // Default to the latest year (the year is kept in the URL once chosen)
  const effectiveYear = filters.year || (years.length > 0 ? String(years[0]) : '');

  // Filter evaluations by selected year
  const filteredEvaluations = useMemo(() => {
    if (!evaluations || !effectiveYear) return [];
    return evaluations.filter((e) => String((e.cycle as any)?.year) === effectiveYear);
  }, [evaluations, effectiveYear]);

  // Counts by status for selected year
  const pendingStaffCount = filteredEvaluations.filter((e) => e.status === 'pending_staff').length;
  const pendingSupervisorCount = filteredEvaluations.filter((e) => e.status === 'pending_supervisor').length;
  const completedCount = filteredEvaluations.filter((e) => e.status === 'completed').length;
  // Evaluating is possible only while the selected year's cycle is open
  const yearCycle = embeddedCycle(filteredEvaluations[0]);
  const yearOpen = getCycleState(yearCycle).isOpen;

  const visibleEvaluations = useMemo(() => {
    const search = filters.q.trim().toLowerCase();
    return [...filteredEvaluations]
      // Name order inside each status (the sort is stable)
      .sort((a, b) => (profileOf(a)?.name || '').localeCompare(profileOf(b)?.name || ''))
      .filter((e) => {
        if (filters.status !== 'all' && e.status !== filters.status) return false;
        const profile = profileOf(e);
        return !search || [profile?.name, profile?.position].some((v) => (v || '').toLowerCase().includes(search));
      });
  }, [filteredEvaluations, filters.q, filters.status]);
  const { sorted: sortedEvaluations, sort, toggleSort } = useTableSort(visibleEvaluations, SUPERVISEE_SORT, {
    key: 'status',
    direction: 'asc',
  });
  const toggleStatus = (status: string) => setFilters({ status: filters.status === status ? 'all' : status });

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
            onClick={() => toggleStatus('pending_staff')}
            active={filters.status === 'pending_staff'}
          />
          <StatCard
            label={statusLabels.pending_supervisor}
            value={pendingSupervisorCount}
            icon={Clock}
            tone={getStatusTone('annualEvaluation', 'pending_supervisor')}
            hint={ts.pendingSupervisorHint}
            onClick={() => toggleStatus('pending_supervisor')}
            active={filters.status === 'pending_supervisor'}
          />
          <StatCard
            label={statusLabels.completed}
            value={completedCount}
            icon={CheckCircle2}
            tone={getStatusTone('annualEvaluation', 'completed')}
            hint={ts.completedHint}
            onClick={() => toggleStatus('completed')}
            active={filters.status === 'completed'}
          />
        </div>

        {yearCycle && !yearOpen && pendingSupervisorCount > 0 && (
          <Notice tone="muted" icon={Lock}>
            <span className="font-medium text-foreground">{t.employee.annual.closedTitle(yearCycle.year)}.</span>{' '}
            {t.employee.annual.closedSupervisorDescription}
          </Notice>
        )}

        {filteredEvaluations.length > 0 ? (
          <Card className="overflow-hidden">
            <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle>{ts.listTitle}</CardTitle>
                <CardDescription>{ts.listDescription(effectiveYear)}</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={ts.searchPlaceholder}
                  aria-label={t.common.search}
                  value={filters.q}
                  onChange={(e) => setFilters({ q: e.target.value })}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" sort={sort} onSort={toggleSort}>
                    {ts.colName}
                  </SortableTableHead>
                  <SortableTableHead sortKey="position" sort={sort} onSort={toggleSort}>
                    {t.common.position}
                  </SortableTableHead>
                  <SortableTableHead sortKey="status" sort={sort} onSort={toggleSort}>
                    {t.common.status}
                  </SortableTableHead>
                  <SortableTableHead sortKey="score" sort={sort} onSort={toggleSort} align="right">
                    {ts.colScore}
                  </SortableTableHead>
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
                  const name = profileOf(evaluation)?.name || '';
                  const canEvaluate = evaluation.status === 'pending_supervisor' && yearOpen;

                  return (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{profileOf(evaluation)?.position || '—'}</TableCell>
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
                        {canEvaluate && (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/dashboard/supervisee-evaluations/${(evaluation.cycle as any)?.id}/${evaluation.user_id}`,
                                { state: returnState }
                              )
                            }
                            aria-label={ts.evaluateFor(name)}
                          >
                            {ts.evaluate}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Anything with answers can be viewed: done, or the staff member's self-evaluation while waiting for you */}
                        {!canEvaluate && evaluation.status !== 'pending_staff' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(`/dashboard/supervisee-evaluations/detail/${evaluation.id}`, { state: returnState })
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
            {sortedEvaluations.length === 0 && (
              <EmptyState compact icon={Search} title={t.common.noResults} description={t.common.noResultsHint} className="border-t" />
            )}
          </Card>
        ) : (
          <EmptyState icon={Users} title={ts.emptyTitle} description={ts.emptyDescription} />
        )}

        {sortedEvaluations.length > 0 && sortedEvaluations.length < filteredEvaluations.length && (
          <p className="text-sm text-muted-foreground">{ts.showing(sortedEvaluations.length, filteredEvaluations.length)}</p>
        )}
      </div>
    </EmployeeLayout>
  );
}
