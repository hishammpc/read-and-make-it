import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvaluationsByProgram } from '@/hooks/useEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { getTrainingRatingTone } from '@/lib/status';
import { getSkillChangeTone, percentOf } from '@/lib/evaluationForms';
import { ImprovementOverview } from '@/components/evaluations/ImprovementOverview';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ToneBadge } from '@/components/common/StatusBadge';
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Download, ClipboardCheck, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';

// Official BM month names — used only for the PDF report and its filename.
const MONTHS = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Mac' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Julai' },
  { value: '8', label: 'Ogos' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Disember' },
];

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

const getMonthLabel = (value: string) => {
  const month = MONTHS.find(m => m.value === value);
  return month?.label || '';
};

export default function Evaluations() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [evalFilter, setEvalFilter] = useState('all');

  const navigate = useNavigate();
  const { t } = useLanguage();
  const te = t.adminTraining.evaluations;
  const tp = t.adminTraining.programs;
  const { data: evaluations, isLoading, error } = useEvaluationsByProgram(
    parseInt(selectedYear),
    fromMonth,
    toMonth
  );

  const filteredEvaluations = useMemo(() => {
    if (!evaluations) return evaluations;
    if (evalFilter === 'required') return evaluations.filter(e => e.notifyForEvaluation);
    if (evalFilter === 'not_required') return evaluations.filter(e => !e.notifyForEvaluation);
    return evaluations;
  }, [evaluations, evalFilter]);

  const handleDownloadPDF = async () => {
    if (!filteredEvaluations || filteredEvaluations.length === 0) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Add MPC logo
    await addLogoToPDF(doc, margin, yPosition, 20, 20);
    yPosition += 5;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Penilaian Program', margin + 25, yPosition + 5);

    // Filter info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let filterText = `Tahun: ${selectedYear}`;
    if (fromMonth && fromMonth !== 'all') {
      filterText += ` | Dari: ${getMonthLabel(fromMonth)}`;
    }
    if (toMonth && toMonth !== 'all') {
      filterText += ` | Hingga: ${getMonthLabel(toMonth)}`;
    }
    if (evalFilter === 'required') {
      filterText += ` | Penilaian: Diperlukan`;
    } else if (evalFilter === 'not_required') {
      filterText += ` | Penilaian: Tidak Diperlukan`;
    }
    doc.text(filterText, margin + 25, yPosition + 12);
    yPosition += 30;

    // Table headers
    const headers = ['#', 'Program', 'Tarikh', 'Participant', 'Responses', 'Rating', 'Score'];
    const colWidths = [10, 90, 55, 25, 25, 25, 25];
    const rowHeight = 8;

    // Draw header background
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');

    // Draw header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    let xPos = margin + 2;
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPosition + 5.5);
      xPos += colWidths[i];
    });
    yPosition += rowHeight;

    // Draw rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    filteredEvaluations.forEach((evaluation, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 25) {
        doc.addPage();
        yPosition = margin;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      }

      // Row data
      const rowData = [
        (index + 1).toString(),
        evaluation.programTitle.length > 45 ? evaluation.programTitle.substring(0, 42) + '...' : evaluation.programTitle,
        `${formatMalaysianDate(evaluation.startDate)} - ${formatMalaysianDate(evaluation.endDate)}`,
        evaluation.totalAssigned.toString(),
        evaluation.totalResponses.toString(),
        ...(evaluation.formVersion === 2
          ? evaluation.improvement
            ? [
                `Meningkat ${percentOf(evaluation.improvement.counts.improved, evaluation.improvement.responses)}%`,
                `${evaluation.improvement.counts.improved}/${evaluation.improvement.responses}`,
              ]
            : ['-', '-']
          : [
              evaluation.totalResponses > 0 ? evaluation.averageRating : '-',
              evaluation.totalResponses > 0 ? evaluation.averageScore.toFixed(2) : '-',
            ]),
      ];

      xPos = margin + 2;
      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, yPosition + 5.5);
        xPos += colWidths[i];
      });
      yPosition += rowHeight;
    });

    // Summary
    yPosition += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jumlah Program: ${filteredEvaluations.length}`, margin, yPosition);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dijana pada: ${new Date().toLocaleString('ms-MY')}`,
      margin,
      pageHeight - 10
    );

    // Save
    const filename = `Laporan_Penilaian_${selectedYear}${fromMonth && fromMonth !== 'all' ? '_' + getMonthLabel(fromMonth) : ''}${toMonth && toMonth !== 'all' ? '_' + getMonthLabel(toMonth) : ''}.pdf`;
    doc.save(filename);
  };

  const hasActiveFilters =
    (!!fromMonth && fromMonth !== 'all') || (!!toMonth && toMonth !== 'all') || evalFilter !== 'all';

  const clearFilters = () => {
    setFromMonth('');
    setToMonth('');
    setEvalFilter('all');
  };

  const monthOptions = t.common.months.map((label, index) => ({ value: String(index + 1), label }));

  return (
    <AdminLayout>
      <PageHeader
        title={te.title}
        description={te.description}
        actions={
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={!filteredEvaluations || filteredEvaluations.length === 0 || isLoading}
          >
            <Download className="h-4 w-4" />
            {t.common.downloadPdf}
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

          <div className="flex items-center gap-2">
            <Label htmlFor="evaluation-filter" className="whitespace-nowrap font-normal text-muted-foreground">
              {te.evaluationFilter}
            </Label>
            <Select value={evalFilter} onValueChange={setEvalFilter}>
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

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground sm:ml-auto">
              {t.common.clearFilters}
            </Button>
          )}
        </div>

        {/* Before/after improvement (programs from 2027) */}
        {!isLoading && !error && filteredEvaluations && <ImprovementOverview programs={filteredEvaluations} />}

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
            ) : !filteredEvaluations || filteredEvaluations.length === 0 ? (
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
                  icon={ClipboardCheck}
                  title={te.emptyTitle}
                  description={te.emptyDescription}
                />
              )
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{te.colProgram}</TableHead>
                    <TableHead className="text-right">{te.colParticipants}</TableHead>
                    <TableHead className="text-right">{te.colResponses}</TableHead>
                    <TableHead>{te.colResult}</TableHead>
                    <TableHead>{te.colEvaluation}</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">{t.common.actions}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.programId}>
                      <TableCell className="max-w-sm">
                        <Link
                          to={`/dashboard/programs/${evaluation.programId}`}
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
                          onClick={() => navigate(`/dashboard/programs/${evaluation.programId}`)}
                          aria-label={tp.viewDetails}
                          title={tp.viewDetails}
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
        )}

        {!isLoading && filteredEvaluations && filteredEvaluations.length > 0 && (
          <p className="text-sm text-muted-foreground">{te.showing(filteredEvaluations.length)}</p>
        )}
      </div>

    </AdminLayout>
  );
}
