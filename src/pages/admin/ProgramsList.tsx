import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProgramsWithStats, useDeleteProgram } from '@/hooks/usePrograms';
import { useTableSort } from '@/hooks/useTableSort';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useReturnState } from '@/hooks/useReturnTo';
import { useToast } from '@/hooks/use-toast';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { downloadCSV } from '@/lib/csvUtils';
import type { SortAccessors } from '@/lib/sort';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ToneBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { PeriodFilter } from '@/components/common/PeriodFilter';
import { periodMonths } from '@/lib/period';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { Skeleton } from '@/components/ui/skeleton';
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
import { Card } from '@/components/ui/card';
import { Plus, Eye, Pencil, Trash2, Search, BookOpen, FileSpreadsheet } from 'lucide-react';

type ProgramRow = NonNullable<ReturnType<typeof useProgramsWithStats>['data']>[number];

const participantsOf = (program: ProgramRow) =>
  ((program as { program_assignments?: Array<{ count: number }> }).program_assignments?.[0]?.count) || 0;

const FILTER_DEFAULTS = {
  q: '',
  year: String(new Date().getFullYear()),
  from: '',
  to: '',
  type: 'all',
  eval: 'all',
};

const NARROWING_FILTERS = ['q', 'from', 'to', 'type', 'eval'] as const;

const PROGRAM_SORT: SortAccessors<ProgramRow, 'title' | 'start' | 'end' | 'hours' | 'assigned' | 'type' | 'evaluation'> = {
  title: (program) => program.title,
  start: (program) => Date.parse(program.start_date_time),
  end: (program) => Date.parse(program.end_date_time),
  hours: (program) => program.hours,
  assigned: participantsOf,
  type: (program) => program.training_type,
  evaluation: (program) => (program.notify_for_evaluation ? 1 : 0),
};

// CSV stays BM (official output)
const TYPE_BM: Record<string, string> = { Local: 'Tempatan', International: 'Antarabangsa' };

export default function ProgramsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const tp = t.adminTraining.programs;
  const typeLabels = t.adminTraining.programForm.trainingTypes;
  const returnState = useReturnState();
  const { data: programs, isLoading, error } = useProgramsWithStats();
  const deleteProgram = useDeleteProgram();
  const { filters, setFilters, clearFilters } = useUrlFilters(FILTER_DEFAULTS);
  const { q: searchQuery, year: selectedYear, type: typeFilter, eval: evaluationFilter } = filters;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);

  const visiblePrograms = useMemo(() => {
    if (!programs) return programs;
    const search = searchQuery.trim().toLowerCase();
    const { from, to } = periodMonths(filters);

    return programs.filter((program) => {
      if (
        search &&
        !program.title.toLowerCase().includes(search) &&
        !(program.description || '').toLowerCase().includes(search)
      ) {
        return false;
      }
      if (typeFilter !== 'all' && program.training_type !== typeFilter) return false;
      if (evaluationFilter === 'required' && !program.notify_for_evaluation) return false;
      if (evaluationFilter === 'not_required' && program.notify_for_evaluation) return false;

      if (selectedYear === 'all') return true;
      const programDate = new Date(program.start_date_time);
      if (programDate.getFullYear().toString() !== selectedYear) return false;
      const programMonth = programDate.getMonth() + 1;
      return programMonth >= from && programMonth <= to;
    });
  }, [programs, searchQuery, selectedYear, filters, typeFilter, evaluationFilter]);

  const { sorted: filteredPrograms, sort, toggleSort } = useTableSort(visiblePrograms, PROGRAM_SORT, {
    key: 'start',
    direction: 'desc',
  });

  const totalHours = useMemo(
    () => filteredPrograms.reduce((sum, program) => sum + (program.hours || 0), 0),
    [filteredPrograms]
  );
  const totalAssigned = useMemo(
    () => filteredPrograms.reduce((sum, program) => sum + participantsOf(program), 0),
    [filteredPrograms]
  );

  const hasActiveFilters = NARROWING_FILTERS.some((key) => filters[key] !== FILTER_DEFAULTS[key] && filters[key] !== 'all');
  const resetFilters = () => clearFilters([...NARROWING_FILTERS]);

  const handleDelete = (id: string) => {
    setProgramToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (programToDelete) {
      deleteProgram.mutate(programToDelete);
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    }
  };

  const handleDownloadCSV = () => {
    const rows = filteredPrograms.map((program) => ({
      Tajuk: program.title,
      'Tarikh Mula': formatMalaysianDate(program.start_date_time),
      'Tarikh Tamat': formatMalaysianDate(program.end_date_time),
      Jam: program.hours,
      Peserta: participantsOf(program),
      Jenis: TYPE_BM[program.training_type || ''] || program.training_type || '',
      Lokasi: program.location || '',
      Penilaian: program.notify_for_evaluation ? 'Diperlukan' : 'Tidak diperlukan',
    }));
    const period = selectedYear === 'all' ? 'semua-tahun' : selectedYear;
    downloadCSV(rows, `senarai-program-${period}.csv`);
    toast({ title: t.common.success, description: tp.csvDownloaded });
  };

  const header = (
    <PageHeader
      title={tp.title}
      description={tp.description}
      actions={
        <Button onClick={() => navigate('/dashboard/programs/new')}>
          <Plus className="h-4 w-4" />
          {tp.create}
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

  return (
    <AdminLayout>
      {header}

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tp.searchPlaceholder}
              aria-label={t.common.search}
              value={searchQuery}
              onChange={(e) => setFilters({ q: e.target.value })}
              className="pl-9"
            />
          </div>

          <PeriodFilter value={filters} onChange={setFilters} allowAllYears />

          <Select value={typeFilter} onValueChange={(type) => setFilters({ type })}>
            <SelectTrigger className="w-full sm:w-40" aria-label={t.adminTraining.programForm.trainingType}>
              <SelectValue placeholder={t.adminTraining.programForm.trainingType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tp.allTypes}</SelectItem>
              <SelectItem value="Local">{typeLabels.Local}</SelectItem>
              <SelectItem value="International">{typeLabels.International}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={evaluationFilter} onValueChange={(value) => setFilters({ eval: value })}>
            <SelectTrigger className="w-full sm:w-44" aria-label={tp.colEvaluation}>
              <SelectValue placeholder={tp.colEvaluation} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tp.allEvaluation}</SelectItem>
              <SelectItem value="required">{t.common.required}</SelectItem>
              <SelectItem value="not_required">{t.common.notRequired}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 sm:ml-auto">
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground">
                {t.common.clearFilters}
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadCSV} disabled={isLoading || filteredPrograms.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              {t.common.downloadCsv}
            </Button>
          </div>
        </div>

        {/* Programs Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filteredPrograms.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                compact
                icon={Search}
                title={t.common.noResults}
                description={t.common.noResultsHint}
                action={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t.common.clearFilters}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                compact
                icon={BookOpen}
                title={tp.emptyTitle}
                description={tp.emptyDescription}
                action={
                  <Button size="sm" onClick={() => navigate('/dashboard/programs/new')}>
                    <Plus className="h-4 w-4" />
                    {tp.create}
                  </Button>
                }
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="title" sort={sort} onSort={toggleSort}>
                    {tp.colTitle}
                  </SortableTableHead>
                  <SortableTableHead sortKey="start" sort={sort} onSort={toggleSort}>
                    {tp.colStart}
                  </SortableTableHead>
                  <SortableTableHead sortKey="end" sort={sort} onSort={toggleSort}>
                    {tp.colEnd}
                  </SortableTableHead>
                  <SortableTableHead sortKey="hours" sort={sort} onSort={toggleSort} align="right">
                    {tp.colHours}
                  </SortableTableHead>
                  <SortableTableHead sortKey="assigned" sort={sort} onSort={toggleSort} align="right">
                    {tp.colAssigned}
                  </SortableTableHead>
                  <SortableTableHead sortKey="type" sort={sort} onSort={toggleSort}>
                    {tp.colType}
                  </SortableTableHead>
                  <SortableTableHead sortKey="evaluation" sort={sort} onSort={toggleSort}>
                    {tp.colEvaluation}
                  </SortableTableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{t.common.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrograms.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="max-w-sm">
                      <Link
                        to={`/dashboard/programs/${program.id}`}
                        state={returnState}
                        className="font-medium hover:text-primary hover:underline underline-offset-4"
                      >
                        {program.title}
                      </Link>
                      {program.description && (
                        <div className="line-clamp-1 text-sm text-muted-foreground">{program.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatMalaysianDate(program.start_date_time)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatMalaysianDate(program.end_date_time)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {program.hours} {t.common.hoursShort}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{participantsOf(program)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {typeLabels[program.training_type || ''] || program.training_type || '—'}
                    </TableCell>
                    <TableCell>
                      {program.notify_for_evaluation ? (
                        <ToneBadge tone="info">{t.common.required}</ToneBadge>
                      ) : (
                        <ToneBadge tone="muted">{t.common.notRequired}</ToneBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/dashboard/programs/${program.id}`, { state: returnState })}
                          aria-label={tp.viewDetails}
                          title={tp.viewDetails}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/dashboard/programs/${program.id}/edit`, { state: returnState })}
                          aria-label={tp.editProgram}
                          title={tp.editProgram}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive-soft hover:text-destructive"
                          onClick={() => handleDelete(program.id)}
                          aria-label={tp.deleteProgram}
                          title={tp.deleteProgram}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">{t.common.total}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {totalHours} {t.common.hoursShort}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{totalAssigned}</TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </Card>

        {/* Results Count */}
        {!isLoading && filteredPrograms.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {tp.showing(filteredPrograms.length, programs?.length || 0)}
          </p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tp.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tp.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
