import { useMemo, useState } from 'react';
import { downloadCSV } from '@/lib/csvUtils';
import { formatMalaysianDate, getMonthRangeBounds } from '@/lib/dateUtils';
import {
  generateProgramList,
  generateProgramOverseas,
  generateStaffHoursSummary,
  generateTrainingHoursByUser,
  type ReportRow,
} from '@/lib/reportQueries';
import { useTableSort } from '@/hooks/useTableSort';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ToneBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  FileText,
  Users,
  BookOpen,
  Plane,
  FileSpreadsheet,
  Loader2,
  SearchX,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';
import type { SortAccessors, SortState, SortValue } from '@/lib/sort';
import { TRAINING_TARGET_HOURS } from '@/lib/trainingTarget';
import { cn } from '@/lib/utils';

// Used by the PDF date-range line (official output, BM regardless of UI language).
const MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
];

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

type ReportType = 'staff-hours-summary' | 'training-hours-user' | 'program-list' | 'program-overseas';

/**
 * How a column's raw value is shown, exported and sorted. Rows keep raw values
 * (ISO dates, numbers, codes) so sorting is by value, not by the formatted text.
 */
type ColumnKind = 'text' | 'number' | 'percent' | 'date' | 'evaluation' | 'target';

interface ReportColumn {
  key: string;
  /** BM header for CSV and PDF (official output) */
  label: string;
  kind: ColumnKind;
  /** PDF column width in mm; each report's widths sum to 267 (A4 landscape less margins) */
  pdfWidth: number;
  /** On-screen width */
  widthClass?: string;
}

interface ReportDefinition {
  icon: LucideIcon;
  /** PDF heading and file name (BM) */
  pdfTitle: string;
  fileName: string;
  columns: ReportColumn[];
  defaultSort: SortState<string>;
}

const REPORTS: Record<ReportType, ReportDefinition> = {
  'staff-hours-summary': {
    icon: Target,
    pdfTitle: 'Ringkasan Jam Latihan Kakitangan',
    fileName: 'ringkasan-jam-kakitangan',
    defaultSort: { key: 'name', direction: 'asc' },
    columns: [
      { key: 'name', label: 'Nama', kind: 'text', pdfWidth: 70, widthClass: 'min-w-[160px]' },
      { key: 'position', label: 'Jawatan', kind: 'text', pdfWidth: 60, widthClass: 'min-w-[140px]' },
      { key: 'supervisor', label: 'Penyelia', kind: 'text', pdfWidth: 60, widthClass: 'min-w-[140px]' },
      { key: 'hours', label: 'Jam Latihan', kind: 'number', pdfWidth: 27, widthClass: 'min-w-[80px]' },
      { key: 'target_percent', label: '% Sasaran', kind: 'percent', pdfWidth: 25, widthClass: 'min-w-[90px]' },
      { key: 'target_status', label: 'Pencapaian', kind: 'target', pdfWidth: 25, widthClass: 'min-w-[110px]' },
    ],
  },
  'training-hours-user': {
    icon: Users,
    pdfTitle: 'Jam Latihan Mengikut Pengguna',
    fileName: 'jam-latihan-mengikut-pengguna',
    defaultSort: { key: 'name', direction: 'asc' },
    columns: [
      { key: 'name', label: 'Nama', kind: 'text', pdfWidth: 50, widthClass: 'w-[20%] min-w-[120px]' },
      { key: 'program', label: 'Program', kind: 'text', pdfWidth: 80, widthClass: 'w-[35%] min-w-[200px]' },
      { key: 'hours', label: 'Jam', kind: 'number', pdfWidth: 20, widthClass: 'w-[8%] min-w-[60px]' },
      { key: 'start_date', label: 'Tarikh Mula', kind: 'date', pdfWidth: 35, widthClass: 'w-[12%] min-w-[100px]' },
      { key: 'end_date', label: 'Tarikh Tamat', kind: 'date', pdfWidth: 35, widthClass: 'w-[12%] min-w-[100px]' },
      { key: 'evaluation', label: 'Penilaian', kind: 'evaluation', pdfWidth: 47, widthClass: 'w-[12%] min-w-[100px]' },
    ],
  },
  'program-list': {
    icon: BookOpen,
    pdfTitle: 'Senarai Program',
    fileName: 'senarai-program',
    defaultSort: { key: 'start_date', direction: 'desc' },
    columns: [
      { key: 'title', label: 'Tajuk', kind: 'text', pdfWidth: 100, widthClass: 'w-[40%] min-w-[250px]' },
      { key: 'start_date', label: 'Tarikh Mula', kind: 'date', pdfWidth: 35, widthClass: 'w-[13%] min-w-[100px]' },
      { key: 'end_date', label: 'Tarikh Tamat', kind: 'date', pdfWidth: 35, widthClass: 'w-[13%] min-w-[100px]' },
      { key: 'hours', label: 'Jam', kind: 'number', pdfWidth: 25, widthClass: 'w-[10%] min-w-[80px]' },
      { key: 'participants', label: 'Peserta', kind: 'number', pdfWidth: 35, widthClass: 'w-[10%] min-w-[80px]' },
      { key: 'total_hours', label: 'Jumlah Jam', kind: 'number', pdfWidth: 37, widthClass: 'w-[10%] min-w-[80px]' },
    ],
  },
  'program-overseas': {
    icon: Plane,
    pdfTitle: 'Program Luar Negara',
    fileName: 'program-luar-negara',
    defaultSort: { key: 'name', direction: 'asc' },
    columns: [
      { key: 'name', label: 'Nama', kind: 'text', pdfWidth: 45, widthClass: 'w-[18%] min-w-[100px]' },
      { key: 'position', label: 'Jawatan', kind: 'text', pdfWidth: 40, widthClass: 'w-[13%] min-w-[90px]' },
      { key: 'program', label: 'Program', kind: 'text', pdfWidth: 70, widthClass: 'w-[30%] min-w-[180px]' },
      { key: 'start_date', label: 'Tarikh Mula', kind: 'date', pdfWidth: 35, widthClass: 'w-[13%] min-w-[90px]' },
      { key: 'end_date', label: 'Tarikh Tamat', kind: 'date', pdfWidth: 35, widthClass: 'w-[13%] min-w-[90px]' },
      { key: 'location', label: 'Lokasi', kind: 'text', pdfWidth: 42, widthClass: 'w-[13%] min-w-[90px]' },
    ],
  },
};

const REPORT_ORDER: ReportType[] = ['staff-hours-summary', 'training-hours-user', 'program-list', 'program-overseas'];

const NUMERIC_KINDS: ColumnKind[] = ['number', 'percent'];

const EVALUATION_BM: Record<string, string> = { done: 'Selesai', pending: 'Belum', not_required: 'Tidak diperlukan' };
const TARGET_BM: Record<string, string> = { met: 'Capai', below: 'Belum capai' };

/** The value written to CSV / PDF (BM, formatted). Numbers stay numbers in the CSV. */
function exportValue(column: ReportColumn, value: ReportRow[string]): string | number {
  if (value === null || value === undefined || value === '') return '';
  switch (column.kind) {
    case 'date':
      return formatMalaysianDate(String(value));
    case 'percent':
      return `${value}%`;
    case 'evaluation':
      return EVALUATION_BM[String(value)] ?? String(value);
    case 'target':
      return TARGET_BM[String(value)] ?? String(value);
    default:
      return value;
  }
}

function sortValue(column: ReportColumn, value: ReportRow[string]): SortValue {
  if (column.kind === 'date' && typeof value === 'string') return Date.parse(value);
  return value;
}

/** What a report was generated for — the PDF heading and file name use this, not the live filters */
interface GeneratedReport {
  report: ReportType;
  year: number;
  fromMonth: number;
  toMonth: number;
  toYear: number;
  rows: ReportRow[];
}

const sum = (rows: ReportRow[], key: string) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

export default function Reports() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const tr = t.adminStaff.reports;
  const currentYear = new Date().getFullYear();

  const [activeReport, setActiveReport] = useState<ReportType>('staff-hours-summary');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [toYear, setToYear] = useState(currentYear.toString());
  const [generated, setGenerated] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const definition = REPORTS[activeReport];
  const accessors = useMemo(
    () =>
      Object.fromEntries(
        definition.columns.map((column) => [column.key, (row: ReportRow) => sortValue(column, row[column.key])])
      ) as SortAccessors<ReportRow, string>,
    [definition]
  );
  // Each report keeps its own sort in the URL
  const { sorted: rows, sort, toggleSort } = useTableSort(
    generated?.rows,
    accessors,
    definition.defaultSort,
    `sort-${activeReport}`
  );

  const generateReport = async () => {
    setIsGenerating(true);

    try {
      const year = parseInt(selectedYear);
      const startMonth = (fromMonth && fromMonth !== 'all') ? parseInt(fromMonth) : 1;
      const endMonth = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;
      const lastYear = parseInt(toYear);

      const { start: startDate, end: endDate } = getMonthRangeBounds(year, startMonth, year, endMonth);

      let data: ReportRow[] = [];
      switch (activeReport) {
        case 'staff-hours-summary':
          data = await generateStaffHoursSummary(year, fromMonth, toMonth);
          break;
        case 'training-hours-user':
          data = await generateTrainingHoursByUser(startDate, endDate);
          break;
        case 'program-list':
          data = await generateProgramList(startDate, endDate);
          break;
        case 'program-overseas':
          data = await generateProgramOverseas(year, lastYear);
          break;
      }

      setGenerated({ report: activeReport, year, fromMonth: startMonth, toMonth: endMonth, toYear: lastYear, rows: data });
      toast({
        title: t.common.success,
        description: tr.generated,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: t.common.errorTitle,
        description: tr.generateFailed,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /** BM period line for the PDF, from what the report was generated for */
  const periodText = (report: GeneratedReport) =>
    report.report === 'program-overseas'
      ? `${report.year} - ${report.toYear}`
      : `${report.year} | ${MONTHS[report.fromMonth - 1]} - ${MONTHS[report.toMonth - 1]}`;

  const fileStem = (report: GeneratedReport) => {
    const period =
      report.report === 'program-overseas'
        ? `${report.year}-${report.toYear}`
        : report.fromMonth === 1 && report.toMonth === 12
          ? `${report.year}`
          : `${report.year}-${String(report.fromMonth).padStart(2, '0')}-${String(report.toMonth).padStart(2, '0')}`;
    return `${REPORTS[report.report].fileName}-${period}`;
  };

  /** Totals shown on screen and printed under the PDF table */
  const totalsFor = (
    report: ReportType,
    data: ReportRow[]
  ): Partial<Record<'met' | 'below' | 'hours' | 'participants' | 'totalHours', number>> => {
    if (report === 'staff-hours-summary') {
      const met = data.filter((row) => row.target_status === 'met').length;
      return { met, below: data.length - met };
    }
    if (report === 'training-hours-user') return { hours: sum(data, 'hours') };
    if (report === 'program-list') return { participants: sum(data, 'participants'), totalHours: sum(data, 'total_hours') };
    return {};
  };

  const pdfFooterLines = (report: ReportType, data: ReportRow[]): string[] => {
    const totals = totalsFor(report, data);
    const lines = [`Jumlah rekod: ${data.length}`];
    if (report === 'staff-hours-summary') {
      lines.push(`Capai ${TRAINING_TARGET_HOURS} jam: ${totals.met} · Belum capai: ${totals.below}`);
      lines.push('Kakitangan aktif sahaja (tidak termasuk pentadbir). Jam dikira mengikut tarikh mula program.');
    } else if (report === 'training-hours-user') {
      lines.push(`Jumlah jam: ${totals.hours}`);
    } else if (report === 'program-list') {
      lines.push(`Jumlah peserta: ${totals.participants} · Jumlah jam terkumpul: ${totals.totalHours}`);
    }
    return lines;
  };

  const handleDownloadCSV = () => {
    if (!generated || rows.length === 0) {
      toast({
        title: t.common.noData,
        description: tr.generateFirst,
        variant: 'destructive',
      });
      return;
    }

    const { columns } = REPORTS[generated.report];
    const csvRows = rows.map((row) =>
      Object.fromEntries(columns.map((column) => [column.label, exportValue(column, row[column.key])]))
    );
    downloadCSV(csvRows, `${fileStem(generated)}.csv`);

    toast({
      title: t.common.success,
      description: tr.csvDownloaded,
    });
  };

  const handleDownloadPDF = async () => {
    if (!generated || rows.length === 0) {
      toast({
        title: t.common.noData,
        description: tr.generateFirst,
        variant: 'destructive',
      });
      return;
    }

    const report = REPORTS[generated.report];
    const { columns } = report;

    // Landscape for better table fit
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    await addLogoToPDF(doc, margin, yPosition, 20, 20);
    yPosition += 5; // Align the title with the logo

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(report.pdfTitle, margin + 25, yPosition + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle =
      generated.report === 'staff-hours-summary'
        ? `${periodText(generated)} | Sasaran: ${TRAINING_TARGET_HOURS} jam setahun`
        : periodText(generated);
    doc.text(subtitle, margin + 25, yPosition + 14);
    yPosition += 28; // Past logo and header

    const tableWidth = pageWidth - (margin * 2);
    const getColX = (colIndex: number): number =>
      columns.slice(0, colIndex).reduce((x, column) => x + column.pdfWidth, margin);

    const drawHeaderRow = () => {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, tableWidth, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      columns.forEach((column, index) => {
        doc.text(column.label, getColX(index) + 2, yPosition + 5.5);
      });
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    };

    drawHeaderRow();

    rows.forEach((row, rowIndex) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
        drawHeaderRow();
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPosition, tableWidth, 7, 'F');
      }

      columns.forEach((column, index) => {
        const value = String(exportValue(column, row[column.key]) || '-');
        // Truncate long text to the column width
        const maxChars = Math.floor(column.pdfWidth / 2);
        const displayValue = value.length > maxChars ? value.substring(0, maxChars - 2) + '..' : value;
        doc.text(displayValue, getColX(index) + 2, yPosition + 5);
      });
      yPosition += 7;
    });

    yPosition += 5;
    doc.setFontSize(9);
    pdfFooterLines(generated.report, rows).forEach((line) => {
      if (yPosition > pageHeight - 10) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });

    doc.save(`${fileStem(generated)}.pdf`);

    toast({
      title: t.common.success,
      description: tr.pdfDownloaded,
    });
  };

  const renderCell = (column: ReportColumn, value: ReportRow[string]) => {
    if (value === null || value === undefined || value === '') return '—';
    switch (column.kind) {
      case 'date':
        return formatMalaysianDate(String(value));
      case 'percent':
        return `${value}%`;
      case 'evaluation':
        if (value === 'not_required') return <span className="text-muted-foreground">{tr.evaluationNotRequired}</span>;
        return (
          <ToneBadge tone={value === 'done' ? 'success' : 'warning'}>
            {value === 'done' ? tr.evaluationDone : tr.evaluationPending}
          </ToneBadge>
        );
      case 'target':
        return (
          <ToneBadge tone={value === 'met' ? 'success' : 'warning'}>
            {value === 'met' ? tr.targetMet : tr.targetBelow}
          </ToneBadge>
        );
      default:
        return String(value);
    }
  };

  const renderTotalChip = (icon: LucideIcon, label: string, value: string, hint?: string) => {
    const Icon = icon;
    return (
      <div
        className="flex h-10 items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 text-sm"
        title={hint}
      >
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
    );
  };

  const renderReportTable = () => {
    if (!generated) {
      return (
        <EmptyState
          compact
          icon={FileText}
          title={tr.promptTitle}
          description={tr.promptDescription}
          className="rounded-lg border border-dashed"
        />
      );
    }

    if (rows.length === 0) {
      return (
        <EmptyState
          compact
          icon={SearchX}
          title={t.common.noData}
          description={tr.noDataDescription}
          className="rounded-lg border border-dashed"
        />
      );
    }

    const { columns } = REPORTS[generated.report];
    const totals = totalsFor(generated.report, rows);
    const formatTotal = (value: number) => value.toLocaleString('ms-MY', { maximumFractionDigits: 1 });

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{tr.totalRecords(rows.length)}</span>
            {generated.report === 'staff-hours-summary' && <span className="ml-2">· {tr.summaryHint}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {generated.report === 'staff-hours-summary' && (
              <>
                {renderTotalChip(CheckCircle2, tr.summaryMet, formatTotal(totals.met ?? 0))}
                {renderTotalChip(AlertTriangle, tr.summaryBelow, formatTotal(totals.below ?? 0))}
              </>
            )}
            {generated.report === 'training-hours-user' &&
              renderTotalChip(Clock, tr.totalHours, `${formatTotal(totals.hours ?? 0)} ${t.common.hoursShort}`)}
            {generated.report === 'program-list' && (
              <>
                {renderTotalChip(
                  Users,
                  tr.accumulatedParticipants,
                  formatTotal(totals.participants ?? 0),
                  tr.accumulatedParticipantsHint
                )}
                {renderTotalChip(
                  Clock,
                  tr.accumulatedHours,
                  `${formatTotal(totals.totalHours ?? 0)} ${t.common.hoursShort}`,
                  tr.accumulatedHoursHint
                )}
              </>
            )}
            <Button onClick={handleDownloadCSV} variant="outline">
              <FileSpreadsheet className="h-4 w-4" />
              {t.common.downloadCsv}
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline">
              <Download className="h-4 w-4" />
              {t.common.downloadPdf}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <SortableTableHead
                      key={column.key}
                      sortKey={column.key}
                      sort={sort}
                      onSort={toggleSort}
                      align={NUMERIC_KINDS.includes(column.kind) ? 'right' : 'left'}
                      className={cn('whitespace-nowrap', column.widthClass)}
                    >
                      {tr.columns[column.key] || column.label}
                    </SortableTableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((column) => {
                      // Titles and program names may wrap
                      const allowWrap = ['title', 'program'].includes(column.key);
                      const isNumeric = NUMERIC_KINDS.includes(column.kind);
                      return (
                        <TableCell
                          key={column.key}
                          className={cn(!allowWrap && 'whitespace-nowrap', isNumeric && 'text-right tabular-nums')}
                        >
                          {renderCell(column, row[column.key])}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => {
    const isOverseas = activeReport === 'program-overseas';
    const monthOptions = t.common.months.map((label, index) => ({ value: String(index + 1), label }));

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="report-year">{isOverseas ? tr.fromYear : t.common.year}</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger id="report-year" className="w-full sm:w-32">
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
        </div>

        {isOverseas ? (
          <div className="space-y-2">
            <Label htmlFor="report-to-year">{tr.toYear}</Label>
            <Select value={toYear} onValueChange={setToYear}>
              <SelectTrigger id="report-to-year" className="w-full sm:w-32">
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
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="report-from-month">{tr.fromMonth}</Label>
              <Select value={fromMonth} onValueChange={setFromMonth}>
                <SelectTrigger id="report-from-month" className="w-full sm:w-40">
                  <SelectValue placeholder={tr.fromMonth} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr.allMonths}</SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-to-month">{tr.toMonth}</Label>
              <Select value={toMonth} onValueChange={setToMonth}>
                <SelectTrigger id="report-to-month" className="w-full sm:w-40">
                  <SelectValue placeholder={tr.toMonth} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr.allMonths}</SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button onClick={generateReport} disabled={isGenerating} className="sm:ml-auto">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr.generating}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              {tr.generate}
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <AdminLayout>
      <PageHeader title={tr.title} description={tr.description} />

      <Tabs
        value={activeReport}
        onValueChange={(value) => {
          setActiveReport(value as ReportType);
          setGenerated(null);
        }}
        className="space-y-6"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          {REPORT_ORDER.map((id) => {
            const Icon = REPORTS[id].icon;
            return (
              <TabsTrigger
                key={id}
                value={id}
                className="flex flex-col items-center gap-1.5 py-2.5 sm:flex-row sm:justify-center sm:gap-2"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-normal text-center text-xs leading-tight sm:text-sm">
                  {tr.types[id].title}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {REPORT_ORDER.map((id) => {
          const Icon = REPORTS[id].icon;
          return (
            <TabsContent key={id} value={id} className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle>{tr.types[id].title}</CardTitle>
                      <CardDescription className="mt-1">{tr.types[id].description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {renderFilters()}
                  {renderReportTable()}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </AdminLayout>
  );
}
