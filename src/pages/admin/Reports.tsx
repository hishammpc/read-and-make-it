import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrograms } from '@/hooks/usePrograms';
import { useUsers } from '@/hooks/useUsers';
import { useEvaluations } from '@/hooks/useEvaluations';
import { supabase } from '@/integrations/supabase/client';
import { downloadCSV, formatDataForCSV } from '@/lib/csvUtils';
import { formatDate } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileText,
  Users,
  Building2,
  ClipboardList,
  BookOpen,
  Star,
  CheckCircle,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ReportType =
  | 'training-hours-user'
  | 'training-hours-department'
  | 'participation-list'
  | 'program-list'
  | 'evaluation-summary'
  | 'mandatory-completion';

interface ReportData {
  [key: string]: any;
}

export default function Reports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: programs } = usePrograms();
  const { data: users } = useUsers();
  const { data: evaluations } = useEvaluations();

  const [activeReport, setActiveReport] = useState<ReportType>('training-hours-user');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Extract unique departments
  const departments = Array.from(
    new Set(
      users
        ?.map((user) => user.department)
        .filter((dept): dept is string => dept !== null && dept !== '') || []
    )
  ).sort();

  const reportTypes = [
    {
      id: 'training-hours-user' as ReportType,
      title: 'Training Hours by User',
      icon: Users,
      description: 'View total training hours and participation for each employee',
      color: 'text-blue-600',
    },
    {
      id: 'training-hours-department' as ReportType,
      title: 'Training Hours by Department',
      icon: Building2,
      description: 'Aggregate training statistics by department',
      color: 'text-green-600',
    },
    {
      id: 'participation-list' as ReportType,
      title: 'Participation List',
      icon: ClipboardList,
      description: 'Complete list of all program assignments',
      color: 'text-purple-600',
    },
    {
      id: 'program-list' as ReportType,
      title: 'Program List',
      icon: BookOpen,
      description: 'Overview of all training programs',
      color: 'text-orange-600',
    },
    {
      id: 'evaluation-summary' as ReportType,
      title: 'Evaluation Summary',
      icon: Star,
      description: 'Summary of program evaluations submitted',
      color: 'text-yellow-600',
    },
    {
      id: 'mandatory-completion' as ReportType,
      title: 'Mandatory Program Completion',
      icon: CheckCircle,
      description: 'Track completion of mandatory training programs',
      color: 'text-red-600',
    },
  ];

  const generateReport = async () => {
    setIsGenerating(true);
    setHasGenerated(false);

    try {
      let data: ReportData[] = [];

      switch (activeReport) {
        case 'training-hours-user':
          data = await generateTrainingHoursByUser();
          break;
        case 'training-hours-department':
          data = await generateTrainingHoursByDepartment();
          break;
        case 'participation-list':
          data = await generateParticipationList();
          break;
        case 'program-list':
          data = await generateProgramList();
          break;
        case 'evaluation-summary':
          data = await generateEvaluationSummary();
          break;
        case 'mandatory-completion':
          data = await generateMandatoryCompletion();
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

  const generateTrainingHoursByUser = async (): Promise<ReportData[]> => {
    let query = supabase
      .from('program_assignments')
      .select(`
        id,
        status,
        created_at,
        profiles:user_id (
          id,
          name,
          email,
          department
        ),
        programs:program_id (
          id,
          title,
          hours,
          start_date_time
        )
      `)
      .eq('status', 'Attended');

    if (departmentFilter !== 'all') {
      query = query.eq('profiles.department', departmentFilter);
    }

    const { data: assignments, error } = await query;

    if (error) throw error;

    // Group by user
    const userMap = new Map<string, {
      name: string;
      email: string;
      department: string;
      total_hours: number;
      programs_attended: number;
    }>();

    assignments?.forEach((assignment: any) => {
      const profile = assignment.profiles;
      const program = assignment.programs;

      if (!profile || !program) return;

      // Filter by date range
      if (startDate && new Date(program.start_date_time) < new Date(startDate)) return;
      if (endDate && new Date(program.start_date_time) > new Date(endDate)) return;

      const userId = profile.id;
      const existing = userMap.get(userId);

      if (existing) {
        existing.total_hours += program.hours || 0;
        existing.programs_attended += 1;
      } else {
        userMap.set(userId, {
          name: profile.name || '',
          email: profile.email || '',
          department: profile.department || 'N/A',
          total_hours: program.hours || 0,
          programs_attended: 1,
        });
      }
    });

    return Array.from(userMap.values());
  };

  const generateTrainingHoursByDepartment = async (): Promise<ReportData[]> => {
    let query = supabase
      .from('program_assignments')
      .select(`
        id,
        status,
        profiles:user_id (
          id,
          name,
          department
        ),
        programs:program_id (
          id,
          title,
          hours,
          start_date_time
        )
      `)
      .eq('status', 'Attended');

    const { data: assignments, error } = await query;

    if (error) throw error;

    // Group by department
    const deptMap = new Map<string, {
      department: string;
      total_hours: number;
      employee_count: Set<string>;
      programs_count: number;
    }>();

    assignments?.forEach((assignment: any) => {
      const profile = assignment.profiles;
      const program = assignment.programs;

      if (!profile || !program) return;

      // Filter by date range
      if (startDate && new Date(program.start_date_time) < new Date(startDate)) return;
      if (endDate && new Date(program.start_date_time) > new Date(endDate)) return;

      const dept = profile.department || 'Unassigned';

      if (departmentFilter !== 'all' && dept !== departmentFilter) return;

      const existing = deptMap.get(dept);

      if (existing) {
        existing.total_hours += program.hours || 0;
        existing.employee_count.add(profile.id);
        existing.programs_count += 1;
      } else {
        deptMap.set(dept, {
          department: dept,
          total_hours: program.hours || 0,
          employee_count: new Set([profile.id]),
          programs_count: 1,
        });
      }
    });

    return Array.from(deptMap.values()).map(item => ({
      department: item.department,
      total_hours: item.total_hours,
      employee_count: item.employee_count.size,
      programs_count: item.programs_count,
    }));
  };

  const generateParticipationList = async (): Promise<ReportData[]> => {
    let query = supabase
      .from('program_assignments')
      .select(`
        id,
        status,
        created_at,
        profiles:user_id (
          name,
          email,
          department
        ),
        programs:program_id (
          title,
          start_date_time
        )
      `);

    if (departmentFilter !== 'all') {
      query = query.eq('profiles.department', departmentFilter);
    }

    if (programFilter !== 'all') {
      query = query.eq('program_id', programFilter);
    }

    const { data: assignments, error } = await query;

    if (error) throw error;

    return assignments
      ?.filter((assignment: any) => {
        if (!assignment.programs?.start_date_time) return false;
        if (startDate && new Date(assignment.programs.start_date_time) < new Date(startDate)) return false;
        if (endDate && new Date(assignment.programs.start_date_time) > new Date(endDate)) return false;
        return true;
      })
      .map((assignment: any) => ({
        employee_name: assignment.profiles?.name || 'N/A',
        email: assignment.profiles?.email || 'N/A',
        department: assignment.profiles?.department || 'N/A',
        program_title: assignment.programs?.title || 'N/A',
        status: assignment.status || 'N/A',
        date: assignment.programs?.start_date_time
          ? formatDate(assignment.programs.start_date_time)
          : 'N/A',
      })) || [];
  };

  const generateProgramList = async (): Promise<ReportData[]> => {
    if (!programs) return [];

    const programsWithCounts = await Promise.all(
      programs.map(async (program) => {
        const { count } = await supabase
          .from('program_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id);

        return {
          title: program.title,
          category: program.category,
          start_date: formatDate(program.start_date_time),
          end_date: formatDate(program.end_date_time),
          hours: program.hours,
          status: program.status,
          participants_count: count || 0,
        };
      })
    );

    return programsWithCounts.filter((program) => {
      if (startDate && new Date(program.start_date) < new Date(startDate)) return false;
      if (endDate && new Date(program.start_date) > new Date(endDate)) return false;
      return true;
    });
  };

  const generateEvaluationSummary = async (): Promise<ReportData[]> => {
    if (!evaluations) return [];

    const programEvalMap = new Map<string, {
      program_title: string;
      evaluations_count: number;
      start_date?: string;
    }>();

    evaluations.forEach((evaluation: any) => {
      const programTitle = evaluation.programs?.title || 'N/A';
      const startDate = evaluation.programs?.start_date_time;

      // Filter by date range
      if (startDate) {
        if (startDate && new Date(startDate) < new Date(startDate)) return;
        if (endDate && new Date(startDate) > new Date(endDate)) return;
      }

      if (programFilter !== 'all' && evaluation.program_id !== programFilter) return;

      const existing = programEvalMap.get(evaluation.program_id);

      if (existing) {
        existing.evaluations_count += 1;
      } else {
        programEvalMap.set(evaluation.program_id, {
          program_title: programTitle,
          evaluations_count: 1,
          start_date: startDate,
        });
      }
    });

    return Array.from(programEvalMap.values()).map(({ program_title, evaluations_count }) => ({
      program_title,
      evaluations_count,
      average_rating: 'N/A', // Can be calculated if rating field exists
    }));
  };

  const generateMandatoryCompletion = async (): Promise<ReportData[]> => {
    if (!users) return [];

    const userCompletionData = await Promise.all(
      users.map(async (user) => {
        // Get all mandatory program assignments for this user
        const { data: assignments } = await supabase
          .from('program_assignments')
          .select(`
            id,
            status,
            programs:program_id (
              id,
              category
            )
          `)
          .eq('user_id', user.id);

        const mandatoryAssignments = assignments?.filter(
          (a: any) => a.programs?.category === 'Mandatory'
        ) || [];

        const mandatoryCompleted = mandatoryAssignments.filter(
          (a: any) => a.status === 'Attended'
        );

        const totalMandatory = mandatoryAssignments.length;
        const completed = mandatoryCompleted.length;
        const percentage = totalMandatory > 0
          ? ((completed / totalMandatory) * 100).toFixed(1)
          : '0.0';

        return {
          employee_name: user.name || 'N/A',
          email: user.email || 'N/A',
          mandatory_programs_assigned: totalMandatory,
          mandatory_programs_completed: completed,
          completion_percentage: `${percentage}%`,
        };
      })
    );

    return userCompletionData.filter((item) => {
      if (departmentFilter !== 'all') {
        const user = users.find(u => u.email === item.email);
        return user?.department === departmentFilter;
      }
      return true;
    });
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
                    <TableHead key={header} className="whitespace-nowrap">
                      {header.replace(/_/g, ' ').toUpperCase()}
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
    const showDateRange = true;
    const showDepartment = activeReport !== 'program-list' && activeReport !== 'evaluation-summary';
    const showProgram = activeReport === 'participation-list' || activeReport === 'evaluation-summary';

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {showDateRange && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        {showDepartment && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showProgram && programs && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Program</label>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-end">
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full"
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
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
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
