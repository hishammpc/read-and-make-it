import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
  Users,
  Lock,
} from 'lucide-react';
import { useAnnualEvaluationCycle, useCloseEvaluationCycle } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { calculateTotalScore, calculatePercentage, SCORE_MAP } from '@/lib/annualEvaluationQuestions';

export default function AnnualEvaluationCycle() {
  const navigate = useNavigate();
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data, isLoading, error } = useAnnualEvaluationCycle(cycleId || '');
  const closeCycle = useCloseEvaluationCycle();

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Ralat memuatkan data: {error.message}</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Kitaran penilaian tidak dijumpai.</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  const { cycle, evaluations } = data;

  // Calculate stats
  const totalStaff = evaluations.length;
  const pendingStaff = evaluations.filter((e) => e.status === 'pending_staff').length;
  const pendingSupervisor = evaluations.filter((e) => e.status === 'pending_supervisor').length;
  const completed = evaluations.filter((e) => e.status === 'completed').length;
  const progressPercentage = totalStaff > 0 ? Math.round((completed / totalStaff) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_staff':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Menunggu Kakitangan
          </Badge>
        );
      case 'pending_supervisor':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <UserCheck className="h-3 w-3 mr-1" />
            Menunggu Penyelia
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Selesai
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/annual-evaluations')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Penilaian Tahunan {cycle.year}
              </h1>
              <p className="text-muted-foreground">
                {formatMalaysianDate(cycle.start_date)} - {formatMalaysianDate(cycle.end_date)}
              </p>
            </div>
          </div>
          {cycle.status === 'active' && (
            <Button
              variant="outline"
              onClick={() => closeCycle.mutate(cycle.id)}
              disabled={closeCycle.isPending}
            >
              <Lock className="h-4 w-4 mr-2" />
              Tutup Kitaran
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jumlah Kakitangan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStaff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Kakitangan</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingStaff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Penyelia</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{pendingSupervisor}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kemajuan Keseluruhan</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completed} daripada {totalStaff} penilaian telah selesai
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Evaluations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Senarai Kakitangan</CardTitle>
            <CardDescription>
              Klik pada kakitangan yang telah selesai untuk melihat keputusan penilaian
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jawatan</TableHead>
                  <TableHead>Penyelia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Markah Penyelia</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => {
                  const supervisorScore = evaluation.supervisor_answers
                    ? calculateTotalScore(evaluation.supervisor_answers as Record<string, number>)
                    : null;
                  const supervisorPercentage = evaluation.supervisor_answers
                    ? calculatePercentage(evaluation.supervisor_answers as Record<string, number>)
                    : null;

                  return (
                    <TableRow
                      key={evaluation.id}
                      className={evaluation.status === 'completed' ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => {
                        if (evaluation.status === 'completed') {
                          navigate(`/dashboard/annual-evaluations/${cycleId}/staff/${evaluation.user_id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {(evaluation.profiles as any)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {(evaluation.profiles as any)?.position || '-'}
                      </TableCell>
                      <TableCell>
                        {(evaluation.supervisor as any)?.name || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
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
                        {evaluation.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/annual-evaluations/${cycleId}/staff/${evaluation.user_id}`);
                            }}
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
      </div>
    </AdminLayout>
  );
}
