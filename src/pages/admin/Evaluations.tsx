import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvaluationsByProgram, type ProgramEvaluationSummary } from '@/hooks/useEvaluations';
import { useTableSort } from '@/hooks/useTableSort';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useReturnState } from '@/hooks/useReturnTo';
import { useToast } from '@/hooks/use-toast';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { downloadCSV } from '@/lib/csvUtils';
import { periodMonths } from '@/lib/period';
import type { SortAccessors } from '@/lib/sort';
import { getTrainingRatingTone } from '@/lib/status';
import { getSkillChangeTone, percentOf } from '@/lib/evaluationForms';
import { ImprovementOverview } from '@/components/evaluations/ImprovementOverview';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ToneBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { PeriodFilter } from '@/components/common/PeriodFilter';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Download, ClipboardCheck, Search, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';

// Official BM month names — used only for the PDF report and file names.
const MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
];

/** Below this share of participants responding, a program counts as "low response" */
const LOW_RESPONSE_PERCENT = 50;

const FILTER_DEFAULTS = {
  q: '',
  year: String(new Date().getFullYear()),
  from: '',
  to: '',
  eval: 'all',
  resp: 'all',
};

const NARROWING_FILTERS = ['q', 'from', 'to', 'eval', 'resp'] as const;

/** Responses as a share of participants (capped at 100: an unassigned staff member's evaluation still counts); null when not required */
const responseRate = (evaluation: ProgramEvaluationSummary) =>
  evaluation.notifyForEvaluation && evaluation.totalAssigned > 0
    ? Math.min(percentOf(evaluation.totalResponses, evaluation.totalAssigned), 100)
    : null;

/** One number per result so v1 (score out of 3) and v2 (% improved) each sort sensibly */
const resultValue = (evaluation: ProgramEvaluationSummary) =>
  evaluation.formVersion === 2
    ? evaluation.improvement
      ? percentOf(evaluation.improvement.counts.improved, evaluation.improvement.responses)
      : null
    : evaluation.totalResponses > 0
      ? evaluation.averageScore
      : null;

const EVALUATION_SORT: SortAccessors<
  ProgramEvaluationSummary,
  'program' | 'participants' | 'responses' | 'rate' | 'result' | 'evaluation'
> = {
  program: (evaluation) => Date.parse(evaluation.startDate),
  participants: (evaluation) => evaluation.totalAssigned,
  responses: (evaluation) => evaluation.totalResponses,
  rate: responseRate,
  result: resultValue,
  evaluation: (evaluation) => (evaluation.notifyForEvaluation ? 1 : 0),
};

/** BM result text for CSV / PDF */
const resultText = (evaluation: ProgramEvaluationSummary): [string, string] =>
  evaluation.formVersion === 2
    ? evaluation.improvement
      ? [
          `Meningkat ${percentOf(evaluation.improvement.counts.improved, evaluation.improvement.responses)}%`,
          `${evaluation.improvement.counts.improved}/${evaluation.improvement.responses}`,
        ]
      : ['-', '-']
    : evaluation.totalResponses > 0
      ? [evaluation.averageRating, evaluation.averageScore.toFixed(2)]
      : ['-', '-'];

export default function Evaluations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const te = t.adminTraining.evaluations;
  const tp = t.adminTraining.programs;
  const returnState = useReturnState();
  const { filters, setFilters, clearFilters } = useUrlFilters(FILTER_DEFAULTS);
  const { q: searchQuery, year: selectedYear, from: fromMonth, to: toMonth, eval: evalFilter, resp: responseFilter } = filters;
  const { data: evaluations, isLoading, error } = useEvaluationsByProgram(parseInt(selectedYear), fromMonth, toMonth);

  const visibleEvaluations = useMemo(() => {
    if (!evaluations) return evaluations;
    const search = searchQuery.trim().toLowerCase();
    return evaluations.filter((evaluation) => {
      if (search && !evaluation.programTitle.toLowerCase().includes(search)) return false;
      if (evalFilter === 'required' && !evaluation.notifyForEvaluation) return false;
      if (evalFilter === 'not_required' && evaluation.notifyForEvaluation) return false;
      if (responseFilter === 'low') {
        const rate = responseRate(evaluation);
        if (rate === null || rate >= LOW_RESPONSE_PERCENT) return false;
      }
      return true;
    });
  }, [evaluations, searchQuery, evalFilter, responseFilter]);

  // Default: newest program first (as before)
  const { sorted: filteredEvaluations, sort, toggleSort } = useTableSort(visibleEvaluations, EVALUATION_SORT, {
    key: 'program',
    direction: 'desc',
  });

  const hasActiveFilters = NARROWING_FILTERS.some((key) => filters[key] !== FILTER_DEFAULTS[key] && filters[key] !== 'all');
  const resetFilters = () => clearFilters([...NARROWING_FILTERS]);

  /** BM description of the filters, for the PDF heading */
  const filterText = () => {
    const { from, to } = periodMonths(filters);
    let text = `Tahun: ${selectedYear}`;
    if (from !== 1 || to !== 12) text += ` | ${MONTHS[from - 1]} - ${MONTHS[to - 1]}`;
    if (evalFilter === 'required') text += ' | Penilaian: Diperlukan';
    else if (evalFilter === 'not_required') text += ' | Penilaian: Tidak Diperlukan';
    if (responseFilter === 'low') text += ` | Maklum balas kurang ${LOW_RESPONSE_PERCENT}%`;
    if (searchQuery.trim()) text += ` | Carian: "${searchQuery.trim()}"`;
    return text;
  };

  const fileStem = () => {
    const { from, to } = periodMonths(filters);
    return `laporan-penilaian-${selectedYear}${from !== 1 || to !== 12 ? `-${MONTHS[from - 1]}-${MONTHS[to - 1]}`.toLowerCase() : ''}`;
  };

  const handleDownloadCSV = () => {
    const rows = filteredEvaluations.map((evaluation) => {
      const [result, score] = resultText(evaluation);
      const rate = responseRate(evaluation);
      return {
        Program: evaluation.programTitle,
        'Tarikh Mula': formatMalaysianDate(evaluation.startDate),
        'Tarikh Tamat': formatMalaysianDate(evaluation.endDate),
        Peserta: evaluation.totalAssigned,
        'Maklum Balas': evaluation.totalResponses,
        'Kadar Maklum Balas (%)': rate ?? '',
        Keputusan: result,
        Skor: score,
        Penilaian: evaluation.notifyForEvaluation ? 'Diperlukan' : 'Tidak diperlukan',
      };
    });
    downloadCSV(rows, `${fileStem()}.csv`);
    toast({ title: t.common.success, description: te.csvDownloaded });
  };

  const handleDownloadPDF = async () => {
    if (filteredEvaluations.length === 0) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    await addLogoToPDF(doc, margin, yPosition, 20, 20);
    yPosition += 5;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Penilaian Program', margin + 25, yPosition + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(filterText(), margin + 25, yPosition + 12);
    yPosition += 30;

    const headers = ['#', 'Program', 'Tarikh', 'Peserta', 'Maklum Balas', 'Kadar', 'Keputusan', 'Skor'];
    const colWidths = [10, 85, 52, 20, 25, 18, 32, 25];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const rowHeight = 8;

    const drawHeaderRow = () => {
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      let x = margin + 2;
      headers.forEach((header, i) => {
        doc.text(header, x, yPosition + 5.5);
        x += colWidths[i];
      });
      yPosition += rowHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    };

    drawHeaderRow();

    filteredEvaluations.forEach((evaluation, index) => {
      if (yPosition > pageHeight - 25) {
        doc.addPage();
        yPosition = margin;
        drawHeaderRow();
      }

      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');
      }

      const rate = responseRate(evaluation);
      const rowData = [
        (index + 1).toString(),
        evaluation.programTitle.length > 45 ? evaluation.programTitle.substring(0, 42) + '...' : evaluation.programTitle,
        `${formatMalaysianDate(evaluation.startDate)} - ${formatMalaysianDate(evaluation.endDate)}`,
        evaluation.totalAssigned.toString(),
        evaluation.totalResponses.toString(),
        rate === null ? '-' : `${rate}%`,
        ...resultText(evaluation),
      ];

      let x = margin + 2;
      rowData.forEach((cell, i) => {
        doc.text(cell, x, yPosition + 5.5);
        x += colWidths[i];
      });
      yPosition += rowHeight;
    });

    yPosition += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jumlah Program: ${filteredEvaluations.length}`, margin, yPosition);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dijana pada: ${new Date().toLocaleString('ms-MY')}`, margin, pageHeight - 10);

    doc.save(`${fileStem()}.pdf`);
  };

  const exportDisabled = filteredEvaluations.length === 0 || isLoading;

  return (
    <AdminLayout>
      <PageHeader
        title={te.title}
        description={te.description}
        actions={
          <>
            <Button variant="outline" onClick={handleDownloadCSV} disabled={exportDisabled}>
              <FileSpreadsheet className="h-4 w-4" />
              {t.common.downloadCsv}
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} disabled={exportDisabled}>
              <Download className="h-4 w-4" />
              {t.common.downloadPdf}
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={te.searchPlaceholder}
              aria-label={t.common.search}
              value={searchQuery}
              onChange={(e) => setFilters({ q: e.target.value })}
              className="pl-9"
            />
          </div>

          <PeriodFilter value={filters} onChange={setFilters} />

          <div className="flex items-center gap-2">
            <Label htmlFor="evaluation-filter" className="whitespace-nowrap font-normal text-muted-foreground">
              {te.evaluationFilter}
            </Label>
            <Select value={evalFilter} onValueChange={(value) => setFilters({ eval: value })}>
              <SelectTrigger id="evaluation-filter" className="w-full sm:w-44">
                <SelectValue placeholder={t.common.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                <SelectItem value="required">{t.common.required}</SelectItem>
                <SelectItem value="not_required">{t.common.notRequired}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={responseFilter} onValueChange={(value) => setFilters({ resp: value })}>
            <SelectTrigger className="w-full sm:w-52" aria-label={te.colResponseRate}>
              <SelectValue placeholder={te.colResponseRate} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{te.allResponseRates}</SelectItem>
              <SelectItem value="low">{te.lowResponse(LOW_RESPONSE_PERCENT)}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground sm:ml-auto">
              {t.common.clearFilters}
            </Button>
          )}
        </div>

        {/* Before/after improvement (programs from 2027) */}
        {!isLoading && !error && visibleEvaluations && <ImprovementOverview programs={visibleEvaluations} />}

        {/* Evaluations Table */}
        {error && !isLoading ? (
          <ErrorState message={error.message} />
        ) : (
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : filteredEvaluations.length === 0 ? (
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
                  icon={ClipboardCheck}
                  title={te.emptyTitle}
                  description={te.emptyDescription}
                />
              )
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead sortKey="program" sort={sort} onSort={toggleSort}>
                      {te.colProgram}
                    </SortableTableHead>
                    <SortableTableHead sortKey="participants" sort={sort} onSort={toggleSort} align="right">
                      {te.colParticipants}
                    </SortableTableHead>
                    <SortableTableHead sortKey="responses" sort={sort} onSort={toggleSort} align="right">
                      {te.colResponses}
                    </SortableTableHead>
                    <SortableTableHead sortKey="rate" sort={sort} onSort={toggleSort} align="right">
                      <span title={te.responseRateHint}>{te.colResponseRate}</span>
                    </SortableTableHead>
                    <SortableTableHead sortKey="result" sort={sort} onSort={toggleSort}>
                      {te.colResult}
                    </SortableTableHead>
                    <SortableTableHead sortKey="evaluation" sort={sort} onSort={toggleSort}>
                      {te.colEvaluation}
                    </SortableTableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">{t.common.actions}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => {
                    const rate = responseRate(evaluation);
                    return (
                      <TableRow key={evaluation.programId}>
                        <TableCell className="max-w-sm">
                          <Link
                            to={`/dashboard/programs/${evaluation.programId}`}
                            state={returnState}
                            className="font-medium underline-offset-4 hover:text-primary hover:underline"
                          >
                            {evaluation.programTitle}
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            {formatMalaysianDate(evaluation.startDate)} - {formatMalaysianDate(evaluation.endDate)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{evaluation.totalAssigned}</TableCell>
                        <TableCell className="text-right tabular-nums">{evaluation.totalResponses}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rate === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : rate < LOW_RESPONSE_PERCENT ? (
                            <ToneBadge tone="warning">{rate}%</ToneBadge>
                          ) : (
                            `${rate}%`
                          )}
                        </TableCell>
                        <TableCell>
                          {evaluation.formVersion === 2 ? (
                            evaluation.improvement ? (
                              <ToneBadge tone={getSkillChangeTone(evaluation.improvement.counts)}>
                                {t.adminTraining.programDetails.improvedBadge(
                                  percentOf(evaluation.improvement.counts.improved, evaluation.improvement.responses)
                                )}
                              </ToneBadge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )
                          ) : evaluation.totalResponses > 0 ? (
                            <ToneBadge tone={getTrainingRatingTone(evaluation.averageRating)}>
                              {evaluation.averageRating}
                            </ToneBadge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {evaluation.notifyForEvaluation ? (
                            <ToneBadge tone="info">{t.common.required}</ToneBadge>
                          ) : (
                            <ToneBadge tone="muted">{t.common.notRequired}</ToneBadge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/dashboard/programs/${evaluation.programId}`, { state: returnState })}
                            aria-label={tp.viewDetails}
                            title={tp.viewDetails}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {!isLoading && filteredEvaluations.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {te.showingOf(filteredEvaluations.length, evaluations?.length || 0)}
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
