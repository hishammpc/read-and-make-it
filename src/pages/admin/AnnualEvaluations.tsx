import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Plus,
  CalendarIcon,
  CalendarClock,
  Users,
  AlertCircle,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';
import {
  useAnnualEvaluationCycles,
  useCreateAnnualEvaluationCycle,
  useStaffWithoutSupervisors,
  useAnnualEvaluationStatsByYear,
} from '@/hooks/useAnnualEvaluations';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

// Generate available years (current year back to 2025)
const currentYear = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from({ length: currentYear - 2024 }, (_, i) => currentYear - i);

export default function AnnualEvaluations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const ta = t.adminStaff.annualCycles;
  const statusLabels = t.status.annualEvaluation;
  const { data: cycles, isLoading, error } = useAnnualEvaluationCycles();
  const { data: staffWithoutSupervisors } = useStaffWithoutSupervisors();
  const createCycle = useCreateAnnualEvaluationCycle();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [createStartDate, setCreateStartDate] = useState<Date | undefined>(new Date(currentYear, 11, 1));
  const [createEndDate, setCreateEndDate] = useState<Date | undefined>(new Date(currentYear + 1, 1, 28));

  // Default stats year to latest cycle year, or current year if no cycles
  const latestCycleYear = cycles?.[0]?.year || currentYear;
  const [statsYear, setStatsYear] = useState<number | null>(null);
  const effectiveStatsYear = statsYear ?? latestCycleYear;
  const { data: evalStats } = useAnnualEvaluationStatsByYear(effectiveStatsYear);

  const handleCreateCycle = () => {
    if (!user?.userId) return;

    // The hook toasts failures (e.g. staff without a supervisor); keep the dialog open then.
    createCycle.mutate(
      {
        year: selectedYear,
        createdBy: user.userId,
        startDate: createStartDate ? format(createStartDate, 'yyyy-MM-dd') : undefined,
        endDate: createEndDate ? format(createEndDate, 'yyyy-MM-dd') : undefined,
      },
      { onSuccess: () => setShowCreateDialog(false) }
    );
  };

  // Update default dates when selected year changes
  const handleYearChange = (value: string) => {
    const year = parseInt(value);
    setSelectedYear(year);
    setCreateStartDate(new Date(year, 11, 1));
    setCreateEndDate(new Date(year + 1, 1, 28));
  };

  const hasStaffWithoutSupervisors = (staffWithoutSupervisors?.length || 0) > 0;

  // Get years that don't have cycles yet
  const existingYears = new Set(cycles?.map((c) => c.year) || []);
  const availableYearsToCreate = AVAILABLE_YEARS.filter((y) => !existingYears.has(y));

  const header = (
    <PageHeader
      title={ta.title}
      description={ta.description}
      actions={
        <Button
          onClick={() => setShowCreateDialog(true)}
          disabled={availableYearsToCreate.length === 0 || hasStaffWithoutSupervisors}
        >
          <Plus className="h-4 w-4" />
          {ta.create}
        </Button>
      }
    />
  );

  if (error) {
    return (
      <AdminLayout>
        {header}
        <ErrorState message={error.message} />
      </AdminLayout>
    );
  }

  const total = evalStats?.total || 0;
  const staffSubmitted = evalStats?.staffSubmitted || 0;
  const completed = evalStats?.completed || 0;
  const completedPercent = evalStats?.total ? Math.round(((evalStats.completed || 0) / evalStats.total) * 100) : 0;

  return (
    <AdminLayout>
      {header}

      <div className="space-y-6">
        {/* Warning if staff without supervisors */}
        {hasStaffWithoutSupervisors && (
          <Alert className="border-warning/30 bg-warning-soft text-warning-soft-foreground [&>svg]:text-warning-soft-foreground">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{ta.noSupervisorTitle(staffWithoutSupervisors?.length || 0)}</AlertTitle>
            <AlertDescription>
              {ta.noSupervisorDescription}{' '}
              <Link
                to="/admin/users"
                className="font-medium underline underline-offset-4 hover:no-underline"
              >
                {ta.viewStaffList}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="stats-year" className="text-sm font-medium text-muted-foreground">
              {ta.statsYear}
            </Label>
            <Select
              value={effectiveStatsYear.toString()}
              onValueChange={(value) => setStatsYear(parseInt(value))}
            >
              <SelectTrigger id="stats-year" className="w-28">
                <SelectValue placeholder={t.common.year} />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={ta.statTotalStaff} value={total} icon={Users} tone="primary" />
            <StatCard
              label={statusLabels.pending_staff}
              value={total - staffSubmitted}
              icon={Clock}
              tone="warning"
              hint={ta.answered(staffSubmitted, total)}
            />
            <StatCard
              label={statusLabels.pending_supervisor}
              value={staffSubmitted - completed}
              icon={UserCheck}
              tone="info"
              hint={ta.reviewed(completed, staffSubmitted)}
            />
            <StatCard
              label={statusLabels.completed}
              value={completed}
              icon={CheckCircle2}
              tone="success"
              hint={ta.completedShare(completedPercent)}
            />
          </div>
        </section>

        {/* Cycles Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{ta.listTitle}</CardTitle>
            <CardDescription>{ta.listDescription}</CardDescription>
          </CardHeader>
          {isLoading ? (
            <div className="space-y-2 px-6 pb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : cycles?.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarClock}
              title={ta.emptyTitle}
              description={ta.emptyDescription}
              className="border-t"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.year}</TableHead>
                  <TableHead>{ta.colPeriod}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{ta.colCreated}</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{t.common.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles?.map((cycle) => (
                  <TableRow
                    key={cycle.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/dashboard/annual-evaluations/${cycle.id}`)}
                  >
                    <TableCell>
                      <Link
                        to={`/dashboard/annual-evaluations/${cycle.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium tabular-nums hover:text-primary hover:underline underline-offset-4"
                      >
                        {cycle.year}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatMalaysianDate(cycle.start_date)} – {formatMalaysianDate(cycle.end_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge kind="cycle" status={cycle.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatMalaysianDate(cycle.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/annual-evaluations/${cycle.id}`);
                        }}
                        aria-label={ta.viewCycle(cycle.year)}
                        title={ta.viewCycle(cycle.year)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Create Cycle Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ta.dialogTitle}</DialogTitle>
            <DialogDescription>{ta.dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">{ta.yearLabel}</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder={ta.yearPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {availableYearsToCreate.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-start-date">{ta.startDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="create-start-date" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4" />
                    {createStartDate ? format(createStartDate, 'dd/MM/yyyy') : ta.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={createStartDate}
                    onSelect={setCreateStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-end-date">{ta.endDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="create-end-date" variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4" />
                    {createEndDate ? format(createEndDate, 'dd/MM/yyyy') : ta.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={createEndDate}
                    onSelect={setCreateEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{ta.supervisorReminder}</AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreateCycle} disabled={createCycle.isPending || availableYearsToCreate.length === 0}>
              {createCycle.isPending ? t.common.submitting : ta.send(selectedYear)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
