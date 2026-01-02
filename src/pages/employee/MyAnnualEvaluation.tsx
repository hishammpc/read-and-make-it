import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  User,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
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
import { useMyPendingAnnualEvaluations, useMyAnnualEvaluation } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  calculateTotalScore,
  calculatePercentage,
  getRatingLabel,
} from '@/lib/annualEvaluationQuestions';

export default function MyAnnualEvaluation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pendingEvaluations, isLoading: pendingLoading } = useMyPendingAnnualEvaluations(user?.userId || '');
  const { data: latestEvaluation, isLoading: latestLoading } = useMyAnnualEvaluation(user?.userId || '');

  const isLoading = pendingLoading || latestLoading;

  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </EmployeeLayout>
    );
  }

  // Check if there's a pending evaluation
  const hasPending = pendingEvaluations && pendingEvaluations.length > 0;
  const pendingEval = hasPending ? pendingEvaluations[0] : null;

  // Check if latest evaluation is completed and can show results
  const isCompleted = latestEvaluation?.status === 'completed';
  const isWaitingSupervisor = latestEvaluation?.status === 'pending_supervisor';

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Penilaian Tahunan</h1>
          <p className="text-muted-foreground">
            Penilaian kompetensi tahunan kakitangan
          </p>
        </div>

        {/* Pending Evaluation Alert */}
        {hasPending && pendingEval && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-800">Penilaian Menunggu</CardTitle>
              </div>
              <CardDescription className="text-orange-700">
                Sila lengkapkan penilaian kendiri anda untuk tahun {(pendingEval.cycle as any)?.year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">
                    Tempoh: {formatMalaysianDate((pendingEval.cycle as any)?.start_date)} - {formatMalaysianDate((pendingEval.cycle as any)?.end_date)}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/dashboard/my-annual-evaluation/${(pendingEval.cycle as any)?.id}/submit`)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Mula Penilaian
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waiting for Supervisor */}
        {isWaitingSupervisor && latestEvaluation && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-800">Menunggu Penilaian Penyelia</CardTitle>
              </div>
              <CardDescription className="text-blue-700">
                Penilaian kendiri anda telah dihantar. Menunggu penyelia melengkapkan penilaian mereka.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Menunggu: {(latestEvaluation.supervisor as any)?.name || 'Penyelia'}
                </Badge>
                {latestEvaluation.staff_submitted_at && (
                  <span className="text-sm text-blue-700">
                    Dihantar: {formatMalaysianDate(latestEvaluation.staff_submitted_at)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Evaluation Results */}
        {isCompleted && latestEvaluation && (
          <CompletedEvaluationView evaluation={latestEvaluation} />
        )}

        {/* No Evaluation Yet */}
        {!hasPending && !latestEvaluation && (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Tiada Penilaian</h3>
              <p className="text-muted-foreground">
                Tiada penilaian tahunan yang perlu dilengkapkan pada masa ini.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </EmployeeLayout>
  );
}

// Component to show completed evaluation with spider chart
function CompletedEvaluationView({ evaluation }: { evaluation: any }) {
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
    staff: staffAnswers[q.id] || 0,
    supervisor: supervisorAnswers[q.id] || 0,
    fullMark: 5,
  }));

  return (
    <>
      {/* Score Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Penilaian Kendiri Anda</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{staffTotal}/100</p>
                <p className="text-muted-foreground">{staffPercentage}%</p>
              </div>
              <Badge
                className={`text-base px-3 py-1 ${
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
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <CardTitle>Penilaian Penyelia</CardTitle>
            </div>
            <CardDescription>
              Oleh: {(evaluation.supervisor as any)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{supervisorTotal}/100</p>
                <p className="text-muted-foreground">{supervisorPercentage}%</p>
              </div>
              <Badge
                className={`text-base px-3 py-1 ${
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
          </CardContent>
        </Card>
      </div>

      {/* Spider Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle>Carta Spider Web - Penilaian Tahun {(evaluation.cycle as any)?.year}</CardTitle>
          </div>
          <CardDescription>
            Perbandingan antara penilaian kendiri (biru) dan penilaian penyelia (hijau)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fontSize: 12, fontWeight: 'bold', fill: '#000000' }}
                  tickCount={6}
                />
                <Radar
                  name="Kendiri"
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
                        <div className="bg-white p-2 border rounded-lg shadow-lg text-sm">
                          <p className="font-semibold mb-1">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }}>
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
    </>
  );
}
