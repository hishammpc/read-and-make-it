import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAssignments } from '@/hooks/useAssignments';
import { useUserEvaluations } from '@/hooks/useEvaluations';
import { useUser } from '@/hooks/useUsers';
import { useTableSort } from '@/hooks/useTableSort';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useToast } from '@/hooks/use-toast';
import { generateCertificate } from '@/lib/certificateGenerator';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { downloadCSV } from '@/lib/csvUtils';
import { YEAR_OPTIONS } from '@/lib/period';
import type { SortAccessors } from '@/lib/sort';
import { TRAINING_TARGET_HOURS, hoursRemaining, isTargetMet } from '@/lib/trainingTarget';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ToneBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Search, AlertCircle, Download, FileText, BookOpen, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';

type Assignment = NonNullable<ReturnType<typeof useUserAssignments>['data']>[number];

const FILTER_DEFAULTS = { q: '', year: String(new Date().getFullYear()) };

const ASSIGNMENT_SORT: SortAccessors<Assignment, 'program' | 'start' | 'end' | 'hours'> = {
  program: (a) => a.programs?.title,
  start: (a) => (a.programs?.start_date_time ? Date.parse(a.programs.start_date_time) : null),
  end: (a) => (a.programs?.end_date_time ? Date.parse(a.programs.end_date_time) : null),
  hours: (a) => a.programs?.hours,
};

const byStartDate = (a: Assignment, b: Assignment) =>
  Date.parse(a.programs?.start_date_time || '') - Date.parse(b.programs?.start_date_time || '');

export default function MyTrainings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const tm = t.employee.myTrainings;
  const { data: assignments, isLoading: assignmentsLoading, error } = useUserAssignments(user?.userId || '');
  const { data: evaluations, isLoading: evaluationsLoading } = useUserEvaluations(user?.userId || '');
  const { data: profile } = useUser(user?.userId || '');
  const { filters, setFilters, clearFilters } = useUrlFilters(FILTER_DEFAULTS);
  const { q: searchQuery, year: selectedYear } = filters;

  const isLoading = assignmentsLoading || evaluationsLoading;

  const evaluatedProgramIds = useMemo(
    () => new Set((evaluations || []).map((e: { program_id: string }) => e.program_id)),
    [evaluations]
  );
  const evaluationText = (assignment: Assignment) =>
    !assignment.programs?.notify_for_evaluation ? '-' : evaluatedProgramIds.has(assignment.program_id) ? 'Selesai' : 'Belum';

  // Every program of the year (by start date) — the training record ignores the search box
  const yearAssignments = useMemo(
    () =>
      (assignments || []).filter(
        (a) => a.programs?.start_date_time && new Date(a.programs.start_date_time).getFullYear().toString() === selectedYear
      ),
    [assignments, selectedYear]
  );
  const visibleAssignments = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return search ? yearAssignments.filter((a) => a.programs?.title?.toLowerCase().includes(search)) : yearAssignments;
  }, [yearAssignments, searchQuery]);
  // Newest first on screen
  const { sorted: assignmentsList, sort, toggleSort } = useTableSort(visibleAssignments, ASSIGNMENT_SORT, {
    key: 'start',
    direction: 'desc',
  });

  const yearHours = yearAssignments.reduce((sum, a) => sum + (a.programs?.hours || 0), 0);
  const listHours = assignmentsList.reduce((sum, a) => sum + (a.programs?.hours || 0), 0);

  const handleDownloadCertificate = async (assignment: Assignment) => {
    await generateCertificate({
      employeeName: user?.name || 'Employee',
      programTitle: assignment.programs?.title || 'Training Program',
      startDate: assignment.programs?.start_date_time || '',
      endDate: assignment.programs?.end_date_time || '',
    });
  };

  // Official training record: BM, every program of the year in date order
  const handleDownloadPDF = async () => {
    const data = [...yearAssignments].sort(byStartDate);
    if (data.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    await addLogoToPDF(doc, margin, 10, 20, 20);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekod Latihan Kakitangan', margin + 25, 17);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama: ${user?.name || '-'}`, margin + 25, 23);
    doc.text(`Jawatan: ${profile?.position || '-'}`, margin + 25, 28);
    doc.text(`Tahun: ${selectedYear}`, margin + 25, 33);

    const targetLine = isTargetMet(yearHours)
      ? `Jumlah jam latihan: ${yearHours} jam (sasaran ${TRAINING_TARGET_HOURS} jam: dicapai)`
      : `Jumlah jam latihan: ${yearHours} jam (sasaran ${TRAINING_TARGET_HOURS} jam: baki ${hoursRemaining(yearHours)} jam)`;
    doc.setFont('helvetica', 'bold');
    doc.text(targetLine, margin, 43);
    doc.setFont('helvetica', 'normal');

    const headers = ['Bil', 'Program', 'Tarikh Mula', 'Tarikh Tamat', 'Jam', 'Penilaian'];
    const colWidths = [12, 75, 30, 30, 15, 20];
    const tableWidth = pageWidth - margin * 2;
    let y = 50;

    const drawHeaderRow = () => {
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, y, tableWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      let x = margin + 2;
      headers.forEach((header, i) => {
        doc.text(header, x, y + 5.5);
        x += colWidths[i];
      });
      y += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    };

    drawHeaderRow();

    data.forEach((assignment, index) => {
      // Full titles: wrap inside the Program column
      const titleLines: string[] = doc.splitTextToSize(assignment.programs?.title || '', colWidths[1] - 3);
      const rowHeight = Math.max(7, titleLines.length * 4.2 + 2.8);

      if (y + rowHeight > pageHeight - 18) {
        doc.addPage();
        y = 15;
        drawHeaderRow();
      }

      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, tableWidth, rowHeight, 'F');
      }

      const cells: Array<string | string[]> = [
        String(index + 1),
        titleLines,
        formatMalaysianDate(assignment.programs?.start_date_time || ''),
        formatMalaysianDate(assignment.programs?.end_date_time || ''),
        String(assignment.programs?.hours || 0),
        evaluationText(assignment),
      ];
      let x = margin + 2;
      cells.forEach((cell, i) => {
        doc.text(cell, x, y + 5);
        x += colWidths[i];
      });
      y += rowHeight;
    });

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Dijana pada: ${formatMalaysianDate(new Date().toISOString())} · Jam dikira mengikut tarikh mula program.`,
      margin,
      pageHeight - 10
    );

    doc.save(`rekod-latihan-${selectedYear}.pdf`);
  };

  // CSV follows the table on screen (search and sort)
  const handleDownloadCSV = () => {
    const rows = assignmentsList.map((a) => ({
      Program: a.programs?.title || '',
      'Tarikh Mula': formatMalaysianDate(a.programs?.start_date_time || ''),
      'Tarikh Tamat': formatMalaysianDate(a.programs?.end_date_time || ''),
      Jam: a.programs?.hours || 0,
      Penilaian: evaluationText(a),
    }));
    downloadCSV(rows, `latihan-saya-${selectedYear}.csv`);
    toast({ title: t.common.success, description: tm.csvDownloaded });
  };

  const hasSearch = !!searchQuery;

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="table" />
      </EmployeeLayout>
    );
  }

  const header = (
    <PageHeader
      title={tm.title}
      description={tm.description}
      actions={
        <>
          <Button variant="outline" onClick={handleDownloadCSV} disabled={assignmentsList.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.common.downloadCsv}
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={yearAssignments.length === 0}>
            <FileText className="h-4 w-4" />
            {tm.downloadTranscript}
          </Button>
        </>
      }
    />
  );

  if (error) {
    return (
      <EmployeeLayout>
        {header}
        <ErrorState message={error.message} />
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      {header}

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tm.searchPlaceholder}
              aria-label={t.common.search}
              value={searchQuery}
              onChange={(e) => setFilters({ q: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select value={selectedYear} onValueChange={(year) => setFilters({ year })}>
            <SelectTrigger className="w-full sm:w-28" aria-label={t.common.year}>
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

          {hasSearch && (
            <Button variant="ghost" size="sm" onClick={() => clearFilters(['q'])} className="text-muted-foreground sm:ml-auto">
              {t.common.clearFilters}
            </Button>
          )}
        </div>

        {/* Trainings table */}
        <Card className="overflow-hidden">
          {assignmentsList.length === 0 ? (
            hasSearch ? (
              <EmptyState
                compact
                icon={Search}
                title={t.common.noResults}
                description={t.common.noResultsHint}
                action={
                  <Button variant="outline" size="sm" onClick={() => clearFilters(['q'])}>
                    {t.common.clearFilters}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                compact
                icon={BookOpen}
                title={tm.emptyTitle}
                description={tm.emptyDescription(selectedYear)}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="program" sort={sort} onSort={toggleSort}>
                    {tm.colProgram}
                  </SortableTableHead>
                  <SortableTableHead sortKey="start" sort={sort} onSort={toggleSort}>
                    {tm.colStart}
                  </SortableTableHead>
                  <SortableTableHead sortKey="end" sort={sort} onSort={toggleSort}>
                    {tm.colEnd}
                  </SortableTableHead>
                  <SortableTableHead sortKey="hours" sort={sort} onSort={toggleSort} align="right">
                    {tm.colHours}
                  </SortableTableHead>
                  <TableHead>{tm.colEvaluation}</TableHead>
                  <TableHead>{tm.colCertificate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsList.map((assignment) => {
                  const isEvaluated = evaluatedProgramIds.has(assignment.program_id);
                  const requiresEvaluation = !!assignment.programs?.notify_for_evaluation;
                  const title = assignment.programs?.title || '';

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="max-w-sm font-medium">{title}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMalaysianDate(assignment.programs?.start_date_time || '')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMalaysianDate(assignment.programs?.end_date_time || '')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {assignment.programs?.hours} {t.common.hoursShort}
                      </TableCell>
                      <TableCell>
                        {!requiresEvaluation ? (
                          <ToneBadge tone="muted">{t.common.notRequired}</ToneBadge>
                        ) : isEvaluated ? (
                          <ToneBadge tone="success" dot>
                            {tm.evaluated}
                          </ToneBadge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/my-evaluations/${assignment.program_id}/submit`)}
                            aria-label={tm.answerFor(title)}
                          >
                            <AlertCircle className="h-4 w-4 text-warning" />
                            {tm.answer}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {!requiresEvaluation ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isEvaluated}
                            onClick={isEvaluated ? () => handleDownloadCertificate(assignment) : undefined}
                            aria-label={tm.downloadCertificateFor(title)}
                          >
                            <Download className="h-4 w-4" />
                            {t.common.download}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {assignmentsList.length > 0 && (
          <p className="text-sm text-muted-foreground">{tm.count(assignmentsList.length, listHours)}</p>
        )}
      </div>
    </EmployeeLayout>
  );
}
