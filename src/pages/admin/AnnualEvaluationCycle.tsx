import { useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CalendarX,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
  Users,
  Lock,
  RotateCcw,
  Search,
  CalendarIcon,
} from 'lucide-react';
import { useAnnualEvaluationCycle, useCloseEvaluationCycle, useResetAnnualEvaluation, useUpdateCycleDates, AnnualEvaluation } from '@/hooks/useAnnualEvaluations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { calculateTotalScore, calculatePercentage } from '@/lib/annualEvaluationQuestions';

type StatusFilter = 'all' | 'pending_staff' | 'pending_supervisor' | 'completed';

/** Ring shown on the stat card whose status is the active table filter (literal for Tailwind). */
const ACTIVE_FILTER_RING: Record<StatusFilter, string> = {
  all: 'ring-2 ring-primary',
  pending_staff: 'ring-2 ring-warning',
  pending_supervisor: 'ring-2 ring-info',
  completed: 'ring-2 ring-success',
};

export default function AnnualEvaluationCycle() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tc = t.adminStaff.annualCycle;
  const statusLabels = t.status.annualEvaluation;
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data, isLoading, error } = useAnnualEvaluationCycle(cycleId || '');
  const closeCycle = useCloseEvaluationCycle();
  const resetEvaluation = useResetAnnualEvaluation();
  const updateCycleDates = useUpdateCycleDates();

  // Date dialog state
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();

  // Close-cycle confirmation state
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  // Reset dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<AnnualEvaluation | null>(null);
  const [resetType, setResetType] = useState<'staff' | 'supervisor' | 'full'>('full');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter evaluations by search query and status - must be before early returns
  const filteredEvaluations = useMemo(() => {
    const evaluations = data?.evaluations || [];
    return evaluations.filter((e) => {
      const matchesSearch = !searchQuery.trim() ||
        ((e.profiles as any)?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.evaluations, searchQuery, statusFilter]);

  const handleResetClick = (evaluation: AnnualEvaluation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvaluation(evaluation);
    setResetType('full');
    setResetDialogOpen(true);
  };

  const handleResetConfirm = () => {
    if (!selectedEvaluation) return;
    resetEvaluation.mutate(
      { evaluationId: selectedEvaluation.id, resetType },
      {
        onSuccess: () => {
          setResetDialogOpen(false);
          setSelectedEvaluation(null);
        },
      }
    );
  };

  const getResetDescription = () => {
    switch (resetType) {
      case 'staff':
        return tc.resetDescStaff(statusLabels.pending_staff);
      case 'supervisor':
        return tc.resetDescSupervisor(statusLabels.pending_supervisor);
      case 'full':
        return tc.resetDescFull(statusLabels.pending_staff);
      default:
        return '';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const openResult = (evaluation: AnnualEvaluation) =>
    navigate(`/dashboard/annual-evaluations/${cycleId}/staff/${evaluation.user_id}`);

  const fallbackHeader = (
    <PageHeader
      title={t.adminStaff.annualCycles.title}
      backTo="/dashboard/annual-evaluations"
      backLabel={tc.backToCycles}
    />
  );

  if (error) {
    return (
      <AdminLayout>
        {fallbackHeader}
        <ErrorState message={error.message} />
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <PageSkeleton variant="table" />
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        {fallbackHeader}
        <EmptyState icon={CalendarX} title={tc.notFoundTitle} description={tc.notFoundDescription} />
      </AdminLayout>
    );
  }

  const { cycle, evaluations } = data;

  // Calculate stats
  const totalStaff = evaluations.length;
  const pendingStaff = evaluations.filter((e) => e.status === 'pending_staff').length;
  const pendingSupervisor = evaluations.filter((e) => e.status === 'pending_supervisor').length;
  const completed = evaluations.filter((e) => e.status === 'completed').length;
  const staffSubmitted = pendingSupervisor + completed;
  const progressPercentage = totalStaff > 0 ? Math.round((completed / totalStaff) * 100) : 0;

  const hasActiveFilters = !!searchQuery.trim() || statusFilter !== 'all';
  const activeRing = (filter: StatusFilter) => (statusFilter === filter ? ACTIVE_FILTER_RING[filter] : undefined);

  return (
    <AdminLayout>
      <PageHeader
        title={tc.title(cycle.year)}
        description={`${formatMalaysianDate(cycle.start_date)} – ${formatMalaysianDate(cycle.end_date)}`}
        backTo="/dashboard/annual-evaluations"
        backLabel={tc.backToCycles}
        actions={
          <>
            <StatusBadge kind="cycle" status={cycle.status} />
            {cycle.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditStartDate(parseISO(cycle.start_date));
                  setEditEndDate(parseISO(cycle.end_date));
                  setDateDialogOpen(true);
                }}
              >
                <CalendarIcon className="h-4 w-4" />
                {tc.setDates}
              </Button>
            )}
            {cycle.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => setCloseDialogOpen(true)}
                disabled={closeCycle.isPending}
              >
                <Lock className="h-4 w-4" />
                {tc.closeCycle}
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-6">
        {/* Stats Cards — each one also filters the table below */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tc.statTotalStaff}
            value={totalStaff}
            icon={Users}
            tone="primary"
            onClick={() => setStatusFilter('all')}
            className={activeRing('all')}
          />
          <StatCard
            label={statusLabels.pending_staff}
            value={pendingStaff}
            icon={Clock}
            tone="warning"
            hint={tc.answered(staffSubmitted, totalStaff)}
            onClick={() => setStatusFilter(statusFilter === 'pending_staff' ? 'all' : 'pending_staff')}
            className={activeRing('pending_staff')}
          />
          <StatCard
            label={statusLabels.pending_supervisor}
            value={pendingSupervisor}
            icon={UserCheck}
            tone="info"
            hint={tc.reviewed(completed, staffSubmitted)}
            onClick={() => setStatusFilter(statusFilter === 'pending_supervisor' ? 'all' : 'pending_supervisor')}
            className={activeRing('pending_supervisor')}
          />
          <StatCard
            label={statusLabels.completed}
            value={completed}
            icon={CheckCircle2}
            tone="success"
            hint={tc.completedShare(progressPercentage)}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            className={activeRing('completed')}
          />
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tc.progressTitle}</span>
              <span className="font-medium tabular-nums">{progressPercentage}%</span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2"
              aria-label={tc.progressTitle}
            />
            <p className="text-xs text-muted-foreground">{tc.progressHint(completed, totalStaff)}</p>
          </CardContent>
        </Card>

        {/* Evaluations Table */}
        <Card className="overflow-hidden">
          <CardHeader className="gap-4 space-y-0 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <CardTitle>{tc.listTitle}</CardTitle>
              <CardDescription>{tc.listDescription}</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-52" aria-label={tc.statusFilter}>
                  <SelectValue placeholder={tc.allStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc.allStatuses}</SelectItem>
                  <SelectItem value="pending_staff">{statusLabels.pending_staff}</SelectItem>
                  <SelectItem value="pending_supervisor">{statusLabels.pending_supervisor}</SelectItem>
                  <SelectItem value="completed">{statusLabels.completed}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={tc.searchPlaceholder}
                  aria-label={t.common.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.position}</TableHead>
                <TableHead>{t.common.supervisor}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="text-right">{tc.colScore}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    {hasActiveFilters ? (
                      <EmptyState
                        compact
                        icon={Search}
                        title={t.common.noResults}
                        description={t.common.noResultsHint}
                        action={
                          <Button variant="outline" size="sm" onClick={clearFilters}>
                            {t.common.clearFilters}
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState compact icon={Users} title={tc.emptyTitle} description={tc.emptyDescription} />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvaluations.map((evaluation) => {
                  const supervisorScore = evaluation.supervisor_answers
                    ? calculateTotalScore(evaluation.supervisor_answers as Record<string, number>)
                    : null;
                  const supervisorPercentage = evaluation.supervisor_answers
                    ? calculatePercentage(evaluation.supervisor_answers as Record<string, number>)
                    : null;
                  const isCompleted = evaluation.status === 'completed';
                  const staffName: string = (evaluation.profiles as any)?.name || '—';

                  return (
                    <TableRow
                      key={evaluation.id}
                      className={isCompleted ? 'cursor-pointer' : undefined}
                      onClick={() => {
                        if (isCompleted) openResult(evaluation);
                      }}
                    >
                      <TableCell>
                        {isCompleted ? (
                          <Link
                            to={`/dashboard/annual-evaluations/${cycleId}/staff/${evaluation.user_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium hover:text-primary hover:underline underline-offset-4"
                          >
                            {staffName}
                          </Link>
                        ) : (
                          <span className="font-medium">{staffName}</span>
                        )}
                      </TableCell>
                      <TableCell>{(evaluation.profiles as any)?.position || '—'}</TableCell>
                      <TableCell>{(evaluation.supervisor as any)?.name || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge kind="annualEvaluation" status={evaluation.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {supervisorScore !== null ? (
                          <>
                            <span className="font-medium">{supervisorScore}/100</span>{' '}
                            <span className="text-muted-foreground">({supervisorPercentage}%)</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openResult(evaluation);
                              }}
                              aria-label={tc.viewResult(staffName)}
                              title={tc.viewResult(staffName)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {evaluation.status !== 'pending_staff' && cycle.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-8 w-8 hover:bg-warning-soft hover:text-warning-soft-foreground',
                                toneClasses.warning.text
                              )}
                              onClick={(e) => handleResetClick(evaluation, e)}
                              aria-label={tc.resetAction(staffName)}
                              title={tc.resetAction(staffName)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Close Cycle Confirmation */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc.closeTitle(cycle.year)}</AlertDialogTitle>
            <AlertDialogDescription>{tc.closeDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeCycle.mutate(cycle.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc.closeCycle}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc.resetTitle}</DialogTitle>
            <DialogDescription>
              {tc.resetFor((selectedEvaluation?.profiles as any)?.name ?? '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-type">{tc.resetTypeLabel}</Label>
              <Select value={resetType} onValueChange={(value) => setResetType(value as 'staff' | 'supervisor' | 'full')}>
                <SelectTrigger id="reset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{tc.resetFull}</SelectItem>
                  {/* Partial resets only make sense from one status each (see useResetAnnualEvaluation) */}
                  {selectedEvaluation?.status === 'pending_supervisor' && (
                    <SelectItem value="staff">{tc.resetStaff}</SelectItem>
                  )}
                  {selectedEvaluation?.status === 'completed' && (
                    <SelectItem value="supervisor">{tc.resetSupervisor}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{getResetDescription()}</AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetConfirm}
              disabled={resetEvaluation.isPending}
            >
              {resetEvaluation.isPending ? tc.resetting : tc.confirmReset}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Dates Dialog */}
      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc.datesTitle}</DialogTitle>
            <DialogDescription>{tc.datesDescription(cycle.year)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cycle-start-date">{tc.startDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="cycle-start-date" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4" />
                    {editStartDate ? format(editStartDate, 'dd/MM/yyyy') : tc.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editStartDate}
                    onSelect={setEditStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle-end-date">{tc.endDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="cycle-end-date" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4" />
                    {editEndDate ? format(editEndDate, 'dd/MM/yyyy') : tc.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editEndDate}
                    onSelect={setEditEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => {
                if (!editStartDate || !editEndDate) return;
                updateCycleDates.mutate(
                  {
                    cycleId: cycle.id,
                    startDate: format(editStartDate, 'yyyy-MM-dd'),
                    endDate: format(editEndDate, 'yyyy-MM-dd'),
                  },
                  { onSuccess: () => setDateDialogOpen(false) }
                );
              }}
              disabled={!editStartDate || !editEndDate || updateCycleDates.isPending}
            >
              {updateCycleDates.isPending ? t.common.saving : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
