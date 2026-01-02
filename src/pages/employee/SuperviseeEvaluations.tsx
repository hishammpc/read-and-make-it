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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Users,
  Clock,
  CheckCircle2,
  ClipboardCheck,
  ChevronRight,
} from 'lucide-react';
import { useSuperviseeEvaluations, usePendingSuperviseeCount } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { calculateTotalScore, calculatePercentage, SCORE_MAP } from '@/lib/annualEvaluationQuestions';

export default function SuperviseeEvaluations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: evaluations, isLoading, error } = useSuperviseeEvaluations(user?.userId || '');
  const { data: pendingCount } = usePendingSuperviseeCount(user?.userId || '');

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
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </EmployeeLayout>
    );
  }

  const pendingEvaluations = evaluations?.filter((e) => e.status === 'pending_supervisor') || [];
  const completedEvaluations = evaluations?.filter((e) => e.status === 'completed') || [];

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Penilaian Kakitangan</h1>
          <p className="text-muted-foreground">
            Senarai kakitangan di bawah penyeliaan anda yang memerlukan penilaian
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Penilaian</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedEvaluations.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Evaluations */}
        {pendingEvaluations.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-orange-600" />
                <CardTitle>Penilaian Menunggu</CardTitle>
              </div>
              <CardDescription>
                Kakitangan yang telah menghantar penilaian kendiri dan menunggu penilaian anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kakitangan</TableHead>
                    <TableHead>Jawatan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Tarikh Hantar</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">
                        {(evaluation.profiles as any)?.name}
                      </TableCell>
                      <TableCell>
                        {(evaluation.profiles as any)?.position || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(evaluation.cycle as any)?.year}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {evaluation.staff_submitted_at
                          ? formatMalaysianDate(evaluation.staff_submitted_at)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Completed Evaluations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Penilaian Selesai</CardTitle>
            </div>
            <CardDescription>
              Senarai kakitangan yang telah dinilai
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completedEvaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada penilaian yang telah selesai.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kakitangan</TableHead>
                    <TableHead>Jawatan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Markah Anda</TableHead>
                    <TableHead>Tarikh Penilaian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedEvaluations.map((evaluation) => {
                    const supervisorScore = evaluation.supervisor_answers
                      ? calculateTotalScore(evaluation.supervisor_answers as Record<string, number>)
                      : 0;
                    const supervisorPercentage = evaluation.supervisor_answers
                      ? calculatePercentage(evaluation.supervisor_answers as Record<string, number>)
                      : 0;

                    return (
                      <TableRow key={evaluation.id}>
                        <TableCell className="font-medium">
                          {(evaluation.profiles as any)?.name}
                        </TableCell>
                        <TableCell>
                          {(evaluation.profiles as any)?.position || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(evaluation.cycle as any)?.year}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {supervisorScore}/100 ({supervisorPercentage}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          {evaluation.supervisor_submitted_at
                            ? formatMalaysianDate(evaluation.supervisor_submitted_at)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* No Supervisees */}
        {evaluations?.length === 0 && (
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
