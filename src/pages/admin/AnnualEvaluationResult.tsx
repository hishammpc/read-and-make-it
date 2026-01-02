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
import { ChevronLeft, AlertCircle, User, UserCheck } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatMalaysianDate } from '@/lib/dateUtils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  RATING_LABELS,
  calculateTotalScore,
  calculatePercentage,
  getRatingLabel,
} from '@/lib/annualEvaluationQuestions';

export default function AnnualEvaluationResult() {
  const navigate = useNavigate();
  const { cycleId, userId } = useParams<{ cycleId: string; userId: string }>();

  // Fetch evaluation data
  const { data: evaluation, isLoading, error } = useQuery({
    queryKey: ['annual-evaluation-result', cycleId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position),
          supervisor:supervisor_id(id, name, email),
          cycle:cycle_id(id, year, start_date, end_date, status)
        `)
        .eq('cycle_id', cycleId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!cycleId && !!userId,
  });

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Ralat memuatkan data: {(error as Error).message}</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!evaluation) {
    return (
      <AdminLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Penilaian tidak dijumpai.</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  const staffAnswers = (evaluation.staff_answers || {}) as Record<string, number>;
  const supervisorAnswers = (evaluation.supervisor_answers || {}) as Record<string, number>;

  const staffTotal = calculateTotalScore(staffAnswers);
  const staffPercentage = calculatePercentage(staffAnswers);
  const supervisorTotal = calculateTotalScore(supervisorAnswers);
  const supervisorPercentage = calculatePercentage(supervisorAnswers);

  const staffRating = getRatingLabel(staffPercentage);
  const supervisorRating = getRatingLabel(supervisorPercentage);

  // Prepare radar chart data (using tahap 1-5 instead of scores 2-10)
  const radarData = ANNUAL_EVALUATION_QUESTIONS.map((q) => ({
    subject: q.shortLabel,
    fullSubject: q.question,
    staff: staffAnswers[q.id] || 0,
    supervisor: supervisorAnswers[q.id] || 0,
    fullMark: 5,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/dashboard/annual-evaluations/${cycleId}`)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kakitangan</p>
                  <p className="text-lg font-semibold">{(evaluation.profiles as any)?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(evaluation.profiles as any)?.position || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Penyelia</p>
                  <p className="text-lg font-semibold">{(evaluation.supervisor as any)?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(evaluation.supervisor as any)?.email}
                  </p>
                </div>
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
                <CardTitle>Penilaian Kendiri (Kakitangan)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-blue-600">{staffTotal}/100</p>
                  <p className="text-lg text-muted-foreground">{staffPercentage}%</p>
                </div>
                <Badge
                  className={`text-lg px-4 py-2 ${
                    staffRating.color === 'green' ? 'bg-green-100 text-green-800' :
                    staffRating.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    staffRating.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    staffRating.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {staffRating.label}
                </Badge>
              </div>
              {evaluation.staff_submitted_at && (
                <p className="text-sm text-muted-foreground mt-4">
                  Dihantar: {formatMalaysianDate(evaluation.staff_submitted_at)}
                </p>
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-green-600">{supervisorTotal}/100</p>
                  <p className="text-lg text-muted-foreground">{supervisorPercentage}%</p>
                </div>
                <Badge
                  className={`text-lg px-4 py-2 ${
                    supervisorRating.color === 'green' ? 'bg-green-100 text-green-800' :
                    supervisorRating.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    supervisorRating.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    supervisorRating.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {supervisorRating.label}
                </Badge>
              </div>
              {evaluation.supervisor_submitted_at && (
                <p className="text-sm text-muted-foreground mt-4">
                  Dihantar: {formatMalaysianDate(evaluation.supervisor_submitted_at)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spider Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Carta Spider Web - Perbandingan Kompetensi</CardTitle>
            <CardDescription>
              Perbandingan antara penilaian kendiri (biru) dan penilaian penyelia (hijau)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
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

        {/* Detailed Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Pecahan Markah Terperinci</CardTitle>
            <CardDescription>
              Perbandingan markah setiap soalan antara kakitangan dan penyelia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Kompetensi</TableHead>
                  <TableHead className="text-center">Kakitangan</TableHead>
                  <TableHead className="text-center">Penyelia</TableHead>
                  <TableHead className="text-center">Perbezaan</TableHead>
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
