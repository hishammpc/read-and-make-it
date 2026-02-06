import { useNavigate, useParams } from 'react-router-dom';
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
import { ChevronLeft, AlertCircle, User, UserCheck, Clock } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { useAnnualEvaluationResult } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  calculateTotalScore,
  calculatePercentage,
  getRatingLabel,
} from '@/lib/annualEvaluationQuestions';

export default function SuperviseeEvaluationDetail() {
  const navigate = useNavigate();
  const { evaluationId } = useParams<{ evaluationId: string }>();

  const { data: evaluation, isLoading, error } = useAnnualEvaluationResult(evaluationId || '');

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
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  if (!evaluation) {
    return (
      <EmployeeLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Penilaian tidak dijumpai.</AlertDescription>
        </Alert>
      </EmployeeLayout>
    );
  }

  const staffAnswers = (evaluation.staff_answers || {}) as Record<string, number>;
  const supervisorAnswers = (evaluation.supervisor_answers || {}) as Record<string, number>;
  const hasStaffAnswers = Object.keys(staffAnswers).length > 0;
  const hasSupervisorAnswers = Object.keys(supervisorAnswers).length > 0;

  const staffTotal = hasStaffAnswers ? calculateTotalScore(staffAnswers) : 0;
  const staffPercentage = hasStaffAnswers ? calculatePercentage(staffAnswers) : 0;
  const staffRating = hasStaffAnswers ? getRatingLabel(staffPercentage) : null;

  const supervisorTotal = hasSupervisorAnswers ? calculateTotalScore(supervisorAnswers) : 0;
  const supervisorPercentage = hasSupervisorAnswers ? calculatePercentage(supervisorAnswers) : 0;
  const supervisorRating = hasSupervisorAnswers ? getRatingLabel(supervisorPercentage) : null;

  // Prepare radar chart data
  const radarData = ANNUAL_EVALUATION_QUESTIONS.map((q) => ({
    subject: q.shortLabel,
    fullSubject: q.question,
    staff: staffAnswers[q.id] || 0,
    supervisor: supervisorAnswers[q.id] || 0,
    fullMark: 5,
  }));

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/supervisee-evaluations')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Keputusan Penilaian
            </h1>
            <p className="text-muted-foreground">
              Penilaian Tahunan {(evaluation.cycle as any)?.year}
            </p>
          </div>
        </div>

        {/* Staff Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kakitangan</p>
                <p className="text-lg font-semibold">{(evaluation.profiles as any)?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(evaluation.profiles as any)?.position || ''}{' '}
                  {(evaluation.profiles as any)?.department ? `· ${(evaluation.profiles as any).department}` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <CardTitle>Penilaian Kendiri</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {hasStaffAnswers ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold text-blue-600">{staffTotal}/100</p>
                      <p className="text-lg text-muted-foreground">{staffPercentage}%</p>
                    </div>
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        staffRating!.color === 'green' ? 'bg-green-100 text-green-800' :
                        staffRating!.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        staffRating!.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        staffRating!.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {staffRating!.label}
                    </Badge>
                  </div>
                  {evaluation.staff_submitted_at && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Dihantar: {formatMalaysianDate(evaluation.staff_submitted_at)}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 py-4">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <p className="text-lg text-gray-500 font-medium">Belum Mula</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <CardTitle>Penilaian Penyelia</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {hasSupervisorAnswers ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold text-green-600">{supervisorTotal}/100</p>
                      <p className="text-lg text-muted-foreground">{supervisorPercentage}%</p>
                    </div>
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        supervisorRating!.color === 'green' ? 'bg-green-100 text-green-800' :
                        supervisorRating!.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        supervisorRating!.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        supervisorRating!.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {supervisorRating!.label}
                    </Badge>
                  </div>
                  {evaluation.supervisor_submitted_at && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Dihantar: {formatMalaysianDate(evaluation.supervisor_submitted_at)}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 py-4">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <p className="text-lg text-orange-600 font-medium">Belum Selesai</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spider Chart - only show if both have answered */}
        {hasStaffAnswers && hasSupervisorAnswers && (
          <Card>
            <CardHeader>
              <CardTitle>Carta Spider Web - Perbandingan Kompetensi</CardTitle>
              <CardDescription>
                Perbandingan antara penilaian kendiri (biru) dan penilaian penyelia (hijau)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] sm:h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 5]}
                      tick={{ fontSize: 12, fontWeight: 'bold', fill: '#000000' }}
                      tickCount={6}
                    />
                    <Radar
                      name="Kakitangan"
                      dataKey="staff"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Penyelia"
                      dataKey="supervisor"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip
                      content={({ payload, label }) => {
                        if (payload && payload.length > 0) {
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold text-sm mb-2">{label}</p>
                              {payload.map((entry: any, index: number) => (
                                <p key={index} className="text-sm" style={{ color: entry.color }}>
                                  {entry.name}: Tahap {entry.value}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Breakdown */}
        {hasStaffAnswers && (
          <Card className="overflow-x-auto">
            <CardHeader>
              <CardTitle>Pecahan Markah Terperinci</CardTitle>
              <CardDescription>
                {hasSupervisorAnswers
                  ? 'Perbandingan markah setiap soalan antara kakitangan dan penyelia'
                  : 'Markah penilaian kendiri bagi setiap soalan'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Kompetensi</TableHead>
                    <TableHead className="text-center">Kakitangan</TableHead>
                    {hasSupervisorAnswers && (
                      <>
                        <TableHead className="text-center">Penyelia</TableHead>
                        <TableHead className="text-center">Perbezaan</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ANNUAL_EVALUATION_QUESTIONS.map((q, index) => {
                    const staffScore = SCORE_MAP[staffAnswers[q.id]] || 0;
                    const supervisorScore = SCORE_MAP[supervisorAnswers[q.id]] || 0;
                    const difference = supervisorScore - staffScore;

                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{q.shortLabel}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {q.question}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {staffScore}/10
                          </Badge>
                        </TableCell>
                        {hasSupervisorAnswers && (
                          <>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {supervisorScore}/10
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`font-medium ${
                                  difference > 0
                                    ? 'text-green-600'
                                    : difference < 0
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {difference > 0 ? '+' : ''}
                                {difference}
                              </span>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </EmployeeLayout>
  );
}
