import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { downloadCSV } from '@/lib/csvUtils';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { formatMalaysianDate, getMonthRangeBounds } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ToneBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';

// Used by the PDF date-range line (official output, BM regardless of UI language).
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

type ReportType = 'training-hours-user' | 'program-list' | 'program-overseas';

interface ReportData {
  [key: string]: any;
}

/** Columns rendered right-aligned in the on-screen table. */
const NUMERIC_COLUMNS = ['hours', 'participants', 'total_hours'];

export default function Reports() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const tr = t.adminStaff.reports;
  const currentYear = new Date().getFullYear();

  const [activeReport, setActiveReport] = useState<ReportType>('training-hours-user');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [toYear, setToYear] = useState(currentYear.toString());
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // `title` feeds the PDF heading and export filenames, so it stays fixed; the UI
  // shows the translated `tr.types[id]` instead.
  const reportTypes = [
    {
      id: 'training-hours-user' as ReportType,
      title: 'Training Hours by Users',
      icon: Users,
    },
    {
      id: 'program-list' as ReportType,
      title: 'Program List',
      icon: BookOpen,
    },
    {
      id: 'program-overseas' as ReportType,
      title: 'Program Overseas',
      icon: Plane,
    },
  ];

  const generateReport = async () => {
    setIsGenerating(true);
    setHasGenerated(false);

    try {
      let data: ReportData[] = [];
      const year = parseInt(selectedYear);
      const startMonth = (fromMonth && fromMonth !== 'all') ? parseInt(fromMonth) : 1;
      const endMonth = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;

      const { start: startDate, end: endDate } = getMonthRangeBounds(year, startMonth, year, endMonth);

      switch (activeReport) {
        case 'training-hours-user':
          data = await generateTrainingHoursByUser(startDate, endDate);
          break;
        case 'program-list':
          data = await generateProgramList(startDate, endDate);
          break;
        case 'program-overseas':
          data = await generateProgramOverseas(year, parseInt(toYear));
          break;
      }

      setReportData(data);
      setHasGenerated(true);
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

  const generateTrainingHoursByUser = async (startDate: string, endDate: string): Promise<ReportData[]> => {
    // Fetch all assignments (no status filter, paginated to bypass the 1000-row cap)
    const assignments = await fetchAllRows((from, to) =>
      supabase
        .from('program_assignments')
        .select(`
          id,
          status,
          user_id,
          profiles:user_id (
            id,
            name
          ),
          programs:program_id (
            id,
            title,
            hours,
            start_date_time,
            end_date_time
          )
        `)
        .range(from, to)
    );

    // Fetch all evaluations to check completion status (paginated)
    const evaluations = await fetchAllRows((from, to) =>
      supabase
        .from('evaluations')
        .select('user_id, program_id')
        .range(from, to)
    );

    // Create a Set for quick lookup of completed evaluations
    const completedEvaluations = new Set(
      evaluations?.map(e => `${e.user_id}-${e.program_id}`) || []
    );

    const result: ReportData[] = [];

    assignments?.forEach((assignment: any) => {
      const profile = assignment.profiles;
      const program = assignment.programs;

      if (!profile || !program) return;

      // Filter by date range
      if (new Date(program.start_date_time) < new Date(startDate)) return;
      if (new Date(program.start_date_time) >= new Date(endDate)) return;

      // Check if evaluation is completed
      const evalKey = `${assignment.user_id}-${program.id}`;
      const evaluationStatus = completedEvaluations.has(evalKey) ? 'Selesai' : 'Belum';

      result.push({
        name: profile.name || 'N/A',
        program: program.title || 'N/A',
        hours: program.hours || 0,
        start_date: formatMalaysianDate(program.start_date_time),
        end_date: formatMalaysianDate(program.end_date_time),
        evaluation: evaluationStatus,
      });
    });

    // Sort by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  };

  const generateProgramList = async (startDate: string, endDate: string): Promise<ReportData[]> => {
    const programs = await fetchAllRows((from, to) =>
      supabase
        .from('programs')
        .select(`
          id,
          title,
          hours,
          start_date_time,
          end_date_time,
          program_assignments(count)
        `)
        .gte('start_date_time', startDate)
        .lt('start_date_time', endDate)
        .order('start_date_time', { ascending: false })
        .range(from, to)
    );

    return programs?.map((program: any) => {
      const participants = program.program_assignments?.[0]?.count || 0;
      const totalHours = (program.hours || 0) * participants;

      return {
        title: program.title,
        start_date: formatMalaysianDate(program.start_date_time),
        end_date: formatMalaysianDate(program.end_date_time),
        hours: program.hours || 0,
        participants,
        total_hours: totalHours,
      };
    }) || [];
  };

  const generateProgramOverseas = async (fromYear: number, toYearParam: number): Promise<ReportData[]> => {
    const { start: startDate, end: endDate } = getMonthRangeBounds(fromYear, 1, toYearParam, 12);

    const assignments = await fetchAllRows((from, to) =>
      supabase
        .from('program_assignments')
        .select(`
          id,
          profiles:user_id (
            name,
            position
          ),
          programs:program_id (
            id,
            title,
            training_type,
            location,
            start_date_time,
            end_date_time
          )
        `)
        .eq('programs.training_type', 'International')
        .range(from, to)
    );

    const result: ReportData[] = [];

    assignments?.forEach((assignment: any) => {
      const profile = assignment.profiles;
      const program = assignment.programs;

      if (!profile || !program) return;
      if (program.training_type !== 'International') return;

      // Filter by date range
      if (new Date(program.start_date_time) < new Date(startDate)) return;
      if (new Date(program.start_date_time) >= new Date(endDate)) return;

      result.push({
        name: profile.name || 'N/A',
        position: profile.position || 'N/A',
        program: program.title || 'N/A',
        start_date: formatMalaysianDate(program.start_date_time),
        end_date: formatMalaysianDate(program.end_date_time),
        location: program.location || 'N/A',
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleDownloadCSV = () => {
    if (reportData.length === 0) {
      toast({
        title: t.common.noData,
        description: tr.generateFirst,
        variant: 'destructive',
      });
      return;
    }

    const reportType = reportTypes.find(r => r.id === activeReport);
    const filename = `${reportType?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(reportData, filename);

    toast({
      title: t.common.success,
      description: tr.csvDownloaded,
    });
  };

  const handleDownloadPDF = async () => {
    if (reportData.length === 0) {
      toast({
        title: t.common.noData,
        description: tr.generateFirst,
        variant: 'destructive',
      });
      return;
    }

    const reportType = reportTypes.find(r => r.id === activeReport);
    const filename = `${reportType?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Create PDF in landscape for better table fit
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
    yPosition += 5; // Adjust title position to align with logo

    // Header labels for display
    const headerLabels: Record<string, string> = {
      name: 'Name',
      program: 'Program',
      hours: 'Hours',
      start_date: 'Start Date',
      end_date: 'End Date',
      evaluation: 'Evaluation',
      title: 'Title',
      participants: 'Participants',
      total_hours: 'Total Hours',
      position: 'Position',
      location: 'Location',
    };

    // Title (positioned next to logo)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportType?.title || 'Report', margin + 25, yPosition + 8);

    // Date range info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let dateRangeText = '';
    if (activeReport === 'program-overseas') {
      dateRangeText = `${selectedYear} - ${toYear}`;
    } else {
      const fromMonthLabel = fromMonth && fromMonth !== 'all' ? MONTHS.find(m => m.value === fromMonth)?.label : 'Januari';
      const toMonthLabel = toMonth && toMonth !== 'all' ? MONTHS.find(m => m.value === toMonth)?.label : 'Disember';
      dateRangeText = `${selectedYear} | ${fromMonthLabel} - ${toMonthLabel}`;
    }
    doc.text(dateRangeText, margin + 25, yPosition + 14);
    yPosition += 28; // Move past logo and header

    // Table headers
    const headers = Object.keys(reportData[0]);
    const tableWidth = pageWidth - (margin * 2);

    // Custom column widths based on report type
    const getColumnWidths = (): number[] => {
      if (activeReport === 'program-list') {
        // title, start_date, end_date, hours, participants, total_hours
        // Make title wider, reduce hours/participants/total_hours
        return [100, 35, 35, 25, 35, 37]; // Total = 267 (fits A4 landscape)
      } else if (activeReport === 'training-hours-user') {
        // name, program, hours, start_date, end_date, evaluation
        return [50, 80, 20, 35, 35, 47];
      } else if (activeReport === 'program-overseas') {
        // name, position, program, start_date, end_date, location
        return [45, 40, 70, 35, 35, 42];
      }
      // Default: equal widths
      return headers.map(() => tableWidth / headers.length);
    };

    const colWidths = getColumnWidths();

    // Helper to get x position for column
    const getColX = (colIndex: number): number => {
      let x = margin;
      for (let i = 0; i < colIndex; i++) {
        x += colWidths[i];
      }
      return x;
    };

    // Draw header row
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, tableWidth, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    headers.forEach((header, index) => {
      const label = headerLabels[header] || header.replace(/_/g, ' ');
      doc.text(label, getColX(index) + 2, yPosition + 5.5);
    });
    yPosition += 8;

    // Draw data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    reportData.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;

        // Redraw header on new page
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition, tableWidth, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        headers.forEach((header, index) => {
          const label = headerLabels[header] || header.replace(/_/g, ' ');
          doc.text(label, getColX(index) + 2, yPosition + 5.5);
        });
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPosition, tableWidth, 7, 'F');
      }

      // Draw row data
      headers.forEach((header, index) => {
        const value = row[header]?.toString() || 'N/A';
        // Truncate long text based on column width
        const maxChars = Math.floor(colWidths[index] / 2);
        const displayValue = value.length > maxChars ? value.substring(0, maxChars - 2) + '..' : value;
        doc.text(displayValue, getColX(index) + 2, yPosition + 5);
      });
      yPosition += 7;
    });

    // Footer with total records
    yPosition += 5;
    doc.setFontSize(9);
    doc.text(`Total Records: ${reportData.length}`, margin, yPosition);

    // Save the PDF
    doc.save(filename);

    toast({
      title: t.common.success,
      description: tr.pdfDownloaded,
    });
  };

  const renderReportTable = () => {
    if (!hasGenerated) {
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

    if (reportData.length === 0) {
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

    const headers = Object.keys(reportData[0]);

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{tr.totalRecords(reportData.length)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
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
                  {headers.map((header) => {
                    // Custom widths based on report type and column
                    let widthClass = '';
                    if (activeReport === 'program-list') {
                      if (header === 'title') widthClass = 'w-[40%] min-w-[250px]';
                      else if (['hours', 'participants', 'total_hours'].includes(header)) widthClass = 'w-[10%] min-w-[80px]';
                      else widthClass = 'w-[13%] min-w-[100px]';
                    } else if (activeReport === 'training-hours-user') {
                      if (header === 'program') widthClass = 'w-[35%] min-w-[200px]';
                      else if (header === 'hours') widthClass = 'w-[8%] min-w-[60px]';
                      else if (header === 'name') widthClass = 'w-[20%] min-w-[120px]';
                      else widthClass = 'w-[12%] min-w-[100px]';
                    } else if (activeReport === 'program-overseas') {
                      if (header === 'program') widthClass = 'w-[30%] min-w-[180px]';
                      else if (header === 'name') widthClass = 'w-[18%] min-w-[100px]';
                      else widthClass = 'w-[13%] min-w-[90px]';
                    }
                    return (
                      <TableHead
                        key={header}
                        className={`whitespace-nowrap ${NUMERIC_COLUMNS.includes(header) ? 'text-right' : ''} ${widthClass}`}
                      >
                        {tr.columns[header] || header.replace(/_/g, ' ').toUpperCase()}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, idx) => (
                  <TableRow key={idx}>
                    {headers.map((header) => {
                      // Allow text wrap for title/program columns
                      const allowWrap = ['title', 'program'].includes(header);
                      const isNumeric = NUMERIC_COLUMNS.includes(header);
                      const value = row[header];

                      if (header === 'evaluation' && (value === 'Selesai' || value === 'Belum')) {
                        return (
                          <TableCell key={header} className="whitespace-nowrap">
                            <ToneBadge tone={value === 'Selesai' ? 'success' : 'warning'}>
                              {value === 'Selesai' ? tr.evaluationDone : tr.evaluationPending}
                            </ToneBadge>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={header}
                          className={`${allowWrap ? '' : 'whitespace-nowrap'} ${isNumeric ? 'text-right tabular-nums' : ''}`}
                        >
                          {value !== null && value !== undefined ? value.toString() : 'N/A'}
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
          setHasGenerated(false);
          setReportData([]);
        }}
        className="space-y-6"
      >
        <TabsList className="grid h-auto w-full grid-cols-3">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <TabsTrigger
                key={report.id}
                value={report.id}
                className="flex flex-col items-center gap-1.5 py-2.5 sm:flex-row sm:justify-center sm:gap-2"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-normal text-center text-xs leading-tight sm:text-sm">
                  {tr.types[report.id].title}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <TabsContent key={report.id} value={report.id} className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle>{tr.types[report.id].title}</CardTitle>
                      <CardDescription className="mt-1">{tr.types[report.id].description}</CardDescription>
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
