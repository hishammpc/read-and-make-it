import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { downloadCSV } from '@/lib/csvUtils';
import { formatMalaysianDate } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileText,
  Users,
  BookOpen,
  Plane,
  AlertCircle,
  ChevronLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

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

export default function Reports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [activeReport, setActiveReport] = useState<ReportType>('training-hours-user');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [toYear, setToYear] = useState(currentYear.toString());
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const reportTypes = [
    {
      id: 'training-hours-user' as ReportType,
      title: 'Training Hours by Users',
      icon: Users,
      description: 'View training hours for each employee',
      color: 'text-blue-600',
    },
    {
      id: 'program-list' as ReportType,
      title: 'Program List',
      icon: BookOpen,
      description: 'Overview of all training programs',
      color: 'text-orange-600',
    },
    {
      id: 'program-overseas' as ReportType,
      title: 'Program Overseas',
      icon: Plane,
      description: 'List of international training programs',
      color: 'text-purple-600',
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

      const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00`;
      const lastDay = new Date(year, endMonth, 0).getDate();
      const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}T23:59:59`;

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
        title: 'Success',
        description: 'Report generated successfully',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTrainingHoursByUser = async (startDate: string, endDate: string): Promise<ReportData[]> => {
    // Fetch all assignments (no status filter)
    const { data: assignments, error } = await supabase
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
      `);

    if (error) throw error;

    // Fetch all evaluations to check completion status
    const { data: evaluations, error: evalError } = await supabase
      .from('evaluations')
      .select('user_id, program_id');

    if (evalError) throw evalError;

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
      if (new Date(program.start_date_time) > new Date(endDate)) return;

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
    const { data: programs, error } = await supabase
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
      .lte('start_date_time', endDate)
      .order('start_date_time', { ascending: false });

    if (error) throw error;

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
    const startDate = `${fromYear}-01-01T00:00:00`;
    const endDate = `${toYearParam}-12-31T23:59:59`;

    const { data: assignments, error } = await supabase
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
      .eq('programs.training_type', 'International');

    if (error) throw error;

    const result: ReportData[] = [];

    assignments?.forEach((assignment: any) => {
      const profile = assignment.profiles;
      const program = assignment.programs;

      if (!profile || !program) return;
      if (program.training_type !== 'International') return;

      // Filter by date range
      if (new Date(program.start_date_time) < new Date(startDate)) return;
      if (new Date(program.start_date_time) > new Date(endDate)) return;

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
        title: 'No Data',
        description: 'Please generate a report first',
        variant: 'destructive',
      });
      return;
    }

    const reportType = reportTypes.find(r => r.id === activeReport);
    const filename = `${reportType?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(reportData, filename);

    toast({
      title: 'Success',
      description: 'Report downloaded successfully',
    });
  };

  const handleDownloadPDF = () => {
    if (reportData.length === 0) {
      toast({
        title: 'No Data',
        description: 'Please generate a report first',
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

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportType?.title || 'Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

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
    doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

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
      title: 'Success',
      description: 'PDF report downloaded successfully',
    });
  };

  const renderReportTable = () => {
    if (!hasGenerated) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure filters and click "Generate Report" to view data
          </AlertDescription>
        </Alert>
      );
    }

    if (reportData.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No data found for the selected filters
          </AlertDescription>
        </Alert>
      );
    }

    const headers = Object.keys(reportData[0]);
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

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Total Records: <span className="font-semibold">{reportData.length}</span>
          </p>
          <div className="flex gap-2">
            <Button onClick={handleDownloadCSV} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
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
                      <TableHead key={header} className={`font-bold whitespace-nowrap ${widthClass}`}>
                        {headerLabels[header] || header.replace(/_/g, ' ').toUpperCase()}
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
                      return (
                        <TableCell key={header} className={allowWrap ? '' : 'whitespace-nowrap'}>
                          {row[header] !== null && row[header] !== undefined
                            ? row[header].toString()
                            : 'N/A'}
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

    return (
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{isOverseas ? 'Dari tahun' : 'Year'}</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
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
          <>
            <span className="text-muted-foreground pb-2">sehingga</span>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hingga tahun</label>
              <Select value={toYear} onValueChange={setToYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
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
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dari bulan</label>
              <Select value={fromMonth} onValueChange={setFromMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Dari bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-muted-foreground pb-2">sehingga</span>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hingga bulan</label>
              <Select value={toMonth} onValueChange={setToMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Hingga bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button
          onClick={generateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>Generating...</>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">Reports Generation</h1>
            </div>
            <p className="text-muted-foreground">
              Generate and export training reports
            </p>
          </div>
        </div>

        <Tabs value={activeReport} onValueChange={(value) => {
          setActiveReport(value as ReportType);
          setHasGenerated(false);
          setReportData([]);
        }}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <TabsTrigger
                  key={report.id}
                  value={report.id}
                  className="flex flex-col items-center gap-2 py-3"
                >
                  <Icon className={`h-5 w-5 ${report.color}`} />
                  <span className="text-xs text-center leading-tight">
                    {report.title}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <TabsContent key={report.id} value={report.id} className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-muted`}>
                        <Icon className={`h-6 w-6 ${report.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{report.title}</CardTitle>
                        <CardDescription className="mt-1.5">
                          {report.description}
                        </CardDescription>
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
      </div>
    </AdminLayout>
  );
}
