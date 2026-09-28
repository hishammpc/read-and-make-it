import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProgramsWithStats, useDeleteProgram } from '@/hooks/usePrograms';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ToneBadge } from '@/components/common/StatusBadge';
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
import { Plus, Eye, Pencil, Trash2, Search, BookOpen } from 'lucide-react';

const currentYear = new Date().getFullYear();
// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

export default function ProgramsList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tp = t.adminTraining.programs;
  const { data: programs, isLoading, error } = useProgramsWithStats();
  const deleteProgram = useDeleteProgram();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);

  const filteredPrograms = useMemo(() => {
    if (!programs) return [];

    return programs.filter((program) => {
      // Search filter
      const matchesSearch = !searchQuery ||
        program.title.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const programDate = new Date(program.start_date_time);
      const programYear = programDate.getFullYear().toString();
      const programMonth = programDate.getMonth() + 1;

      const matchesYear = programYear === selectedYear;

      if (!matchesYear) return false;

      // If no month range selected or "all" selected, show all for the year
      if ((!fromMonth || fromMonth === 'all') && (!toMonth || toMonth === 'all')) return true;

      const from = (fromMonth && fromMonth !== 'all') ? parseInt(fromMonth) : 1;
      const to = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;

      return programMonth >= from && programMonth <= to;
    });
  }, [programs, searchQuery, selectedYear, fromMonth, toMonth]);

  const totalHours = useMemo(() => {
    return filteredPrograms.reduce((sum, program) => sum + (program.hours || 0), 0);
  }, [filteredPrograms]);

  const totalAssigned = useMemo(() => {
    return filteredPrograms.reduce((sum, program) => {
      const count = (program as any).program_assignments?.[0]?.count || 0;
      return sum + count;
    }, 0);
  }, [filteredPrograms]);

  const hasActiveFilters =
    !!searchQuery || (!!fromMonth && fromMonth !== 'all') || (!!toMonth && toMonth !== 'all');

  const clearFilters = () => {
    setSearchQuery('');
    setFromMonth('');
    setToMonth('');
  };

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

  const monthOptions = t.common.months.map((label, index) => ({ value: String(index + 1), label }));

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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-28" aria-label={t.common.year}>
              <SelectValue placeholder={t.common.year} />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select value={fromMonth} onValueChange={setFromMonth}>
              <SelectTrigger className="w-full sm:w-40" aria-label={tp.fromMonth}>
                <SelectValue placeholder={tp.fromMonth} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tp.allMonths}</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">{t.common.to.toLowerCase()}</span>

            <Select value={toMonth} onValueChange={setToMonth}>
              <SelectTrigger className="w-full sm:w-40" aria-label={tp.toMonth}>
                <SelectValue placeholder={tp.toMonth} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tp.allMonths}</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground sm:ml-auto">
              {t.common.clearFilters}
            </Button>
          )}
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
                  <Button variant="outline" size="sm" onClick={clearFilters}>
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
                  <TableHead>{tp.colTitle}</TableHead>
                  <TableHead>{tp.colStart}</TableHead>
                  <TableHead>{tp.colEnd}</TableHead>
                  <TableHead className="text-right">{tp.colHours}</TableHead>
                  <TableHead className="text-right">{tp.colAssigned}</TableHead>
                  <TableHead>{tp.colEvaluation}</TableHead>
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
                    <TableCell className="text-right">
                      {program.hours} {t.common.hoursShort}
                    </TableCell>
                    <TableCell className="text-right">{(program as any).program_assignments?.[0]?.count || 0}</TableCell>
                    <TableCell>
                      {(program as any).notify_for_evaluation ? (
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
                          onClick={() => navigate(`/dashboard/programs/${program.id}`)}
                          aria-label={tp.viewDetails}
                          title={tp.viewDetails}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/dashboard/programs/${program.id}/edit`)}
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
                  <TableCell className="text-right font-semibold">
                    {totalHours} {t.common.hoursShort}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{totalAssigned}</TableCell>
                  <TableCell colSpan={2} />
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
