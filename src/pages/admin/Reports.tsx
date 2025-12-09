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
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [toMonth, setToMonth] = useState('');
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
      const endMonth = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;

      const startDate = `${year}-01-01T00:00:00`;
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
          data = await generateProgramOverseas(year);
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
    const { data: assignments, error } = await supabase
      .from('program_assignments')
      .select(`
        id,
        status,
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
      .eq('status', 'Attended');

    if (error) throw error;

    const result: ReportData[] = [];

    assignments?.forEach((assignment: any) => {
      const profile = assignment.profiles;
      const program = assignment.programs;

      if (!profile || !program) return;

      // Filter by date range
      if (new Date(program.start_date_time) < new Date(startDate)) return;
      if (new Date(program.start_date_time) > new Date(endDate)) return;

      result.push({
        name: profile.name || 'N/A',
        program: program.title || 'N/A',
        hours: program.hours || 0,
        start_date: formatMalaysianDate(program.start_date_time),
        end_date: formatMalaysianDate(program.end_date_time),
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

  const generateProgramOverseas = async (year: number): Promise<ReportData[]> => {
    const startOfYear = `${year}-01-01T00:00:00`;
    const endOfYear = `${year}-12-31T23:59:59`;

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

      // Filter by year
      if (new Date(program.start_date_time) < new Date(startOfYear)) return;
      if (new Date(program.start_date_time) > new Date(endOfYear)) return;

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
          <Button onClick={handleDownloadCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="font-bold whitespace-nowrap">
                      {headerLabels[header] || header.replace(/_/g, ' ').toUpperCase()}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, idx) => (
                  <TableRow key={idx}>
                    {headers.map((header) => (
                      <TableCell key={header} className="whitespace-nowrap">
                        {row[header] !== null && row[header] !== undefined
                          ? row[header].toString()
                          : 'N/A'}
                      </TableCell>
                    ))}
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
          <label className="text-sm font-medium">Year</label>
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

        {!isOverseas && (
          <>
            <span className="text-muted-foreground pb-2">sehingga</span>
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={toMonth} onValueChange={setToMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
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
