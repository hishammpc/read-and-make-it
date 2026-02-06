import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  Eye,
  MinusCircle,
} from 'lucide-react';
import { useSuperviseeEvaluations, usePendingSuperviseeCount } from '@/hooks/useAnnualEvaluations';
import { calculateTotalScore, calculatePercentage } from '@/lib/annualEvaluationQuestions';

export default function SuperviseeEvaluations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: evaluations, isLoading, error } = useSuperviseeEvaluations(user?.userId || '');
  const { data: pendingCount } = usePendingSuperviseeCount(user?.userId || '');

  // Extract unique years from evaluations
  const years = useMemo(() => {
    if (!evaluations) return [];
    const yearSet = new Set<number>();
    evaluations.forEach((e) => {
      const year = (e.cycle as any)?.year;
      if (year) yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [evaluations]);

  const [selectedYear, setSelectedYear] = useState<string>('');

  // Set default year when years are available
  const effectiveYear = selectedYear || (years.length > 0 ? String(years[0]) : '');

  // Filter evaluations by selected year
  const filteredEvaluations = useMemo(() => {
    if (!evaluations || !effectiveYear) return [];
    return evaluations.filter((e) => String((e.cycle as any)?.year) === effectiveYear);
  }, [evaluations, effectiveYear]);

  // Counts by status for selected year
  const pendingStaffCount = filteredEvaluations.filter((e) => e.status === 'pending_staff').length;
  const pendingSupervisorCount = filteredEvaluations.filter((e) => e.status === 'pending_supervisor').length;
  const completedCount = filteredEvaluations.filter((e) => e.status === 'completed').length;

  if (error) {
    return (
      <EmployeeLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Ralat memuatkan data: {(error as Error).message}</AlertDescription>
        </Alert>
      </EmployeeLayout>
    );
  }

  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </EmployeeLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Selesai</Badge>;
      case 'pending_supervisor':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Menunggu Penilaian</Badge>;
      case 'pending_staff':
        return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Belum Mula</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Sort: pending_supervisor first, then pending_staff, then completed
  const sortedEvaluations = [...filteredEvaluations].sort((a, b) => {
    const order = { pending_supervisor: 0, pending_staff: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Penilaian Kakitangan</h1>
            <p className="text-muted-foreground">
              Senarai kakitangan di bawah penyeliaan anda
            </p>
          </div>
          {years.length > 0 && (
            <Select value={effectiveYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Belum Mula</CardTitle>
              <MinusCircle className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{pendingStaffCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Penilaian</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingSupervisorCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        {filteredEvaluations.length > 0 ? (
          <Card className="overflow-x-auto">
            <CardHeader>
              <CardTitle>Senarai Kakitangan</CardTitle>
              <CardDescription>
                Semua kakitangan di bawah penyeliaan anda untuk tahun {effectiveYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kakitangan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Markah</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEvaluations.map((evaluation) => {
                    const supervisorScore = evaluation.supervisor_answers
                      ? calculateTotalScore(evaluation.supervisor_answers as Record<string, number>)
                      : null;
                    const supervisorPercentage = evaluation.supervisor_answers
                      ? calculatePercentage(evaluation.supervisor_answers as Record<string, number>)
                      : null;

                    return (
                      <TableRow key={evaluation.id}>
                        <TableCell className="font-medium">
                          {(evaluation.profiles as any)?.name}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(evaluation.status)}
                        </TableCell>
                        <TableCell>
                          {supervisorScore !== null ? (
                            <span className="font-medium">
                              {supervisorScore}/100 ({supervisorPercentage}%)
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {evaluation.status === 'pending_supervisor' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/dashboard/supervisee-evaluations/${(evaluation.cycle as any)?.id}/${evaluation.user_id}`
                                )
                              }
                            >
                              Nilai
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                          {evaluation.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/dashboard/supervisee-evaluations/detail/${evaluation.id}`
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Lihat
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Tiada Kakitangan</h3>
              <p className="text-muted-foreground">
                Tiada kakitangan di bawah penyeliaan anda yang memerlukan penilaian.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </EmployeeLayout>
  );
}
