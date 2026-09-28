import { useParams } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ToneBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileQuestion, User, UserCheck } from 'lucide-react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { getRatingLevelTone, getRatingPercentageTone, toneClasses, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  calculateTotalScore,
  calculatePercentage,
  getRatingLabel,
} from '@/lib/annualEvaluationQuestions';

/** One side of the score summary (self-assessment or supervisor). */
function ScoreSummaryCard({
  title,
  icon: Icon,
  identityTone,
  total,
  percentage,
  submittedAt,
  submittedLabel,
}: {
  title: string;
  icon: typeof User;
  identityTone: StatusTone;
  total: number;
  percentage: number;
  submittedAt: string | null | undefined;
  submittedLabel: (date: string) => string;
}) {
  const rating = getRatingLabel(percentage);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', toneClasses[identityTone].text)} />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {total}
              <span className="text-lg font-normal text-muted-foreground">/100</span>
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">{percentage}%</p>
          </div>
          {/* Rating words are official BM — not translated. */}
          <ToneBadge tone={getRatingPercentageTone(percentage)} className="px-3 py-1 text-sm">
            {rating.label}
          </ToneBadge>
        </div>
        {submittedAt && (
          <p className="mt-4 text-sm text-muted-foreground">{submittedLabel(formatMalaysianDate(submittedAt))}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnnualEvaluationResult() {
  const { t } = useLanguage();
  const tr = t.adminStaff.annualResult;
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

  const backTo = `/dashboard/annual-evaluations/${cycleId}`;

  const fallbackHeader = <PageHeader title={tr.title} backTo={backTo} backLabel={tr.backToCycle} />;

  if (error) {
    return (
      <AdminLayout>
        {fallbackHeader}
        <ErrorState message={(error as Error).message} />
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <PageSkeleton variant="detail" />
      </AdminLayout>
    );
  }

  if (!evaluation) {
    return (
      <AdminLayout>
        {fallbackHeader}
        <EmptyState icon={FileQuestion} title={tr.notFoundTitle} description={tr.notFoundDescription} />
      </AdminLayout>
    );
  }

  const staffAnswers = (evaluation.staff_answers || {}) as Record<string, number>;
  const supervisorAnswers = (evaluation.supervisor_answers || {}) as Record<string, number>;

  const staffTotal = calculateTotalScore(staffAnswers);
  const staffPercentage = calculatePercentage(staffAnswers);
  const supervisorTotal = calculateTotalScore(supervisorAnswers);
  const supervisorPercentage = calculatePercentage(supervisorAnswers);

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
      <PageHeader
        title={tr.title}
        description={tr.description((evaluation.cycle as any)?.year ?? '')}
        backTo={backTo}
        backLabel={tr.backToCycle}
      />

      <div className="space-y-6">
        {/* Staff Info Card */}
        <Card>
          <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
            <div className="flex items-start gap-4">
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', toneClasses.info.soft)}>
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{tr.staff}</p>
                <p className="text-lg font-semibold">{(evaluation.profiles as any)?.name}</p>
                <p className="text-sm text-muted-foreground">{(evaluation.profiles as any)?.position || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', toneClasses.success.soft)}>
                <UserCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t.common.supervisor}</p>
                <p className="text-lg font-semibold">{(evaluation.supervisor as any)?.name}</p>
                <p className="break-words text-sm text-muted-foreground">{(evaluation.supervisor as any)?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Summary — identity colours match the chart legend (staff blue, supervisor green) */}
        <div className="grid gap-4 md:grid-cols-2">
          <ScoreSummaryCard
            title={tr.selfAssessment}
            icon={User}
            identityTone="info"
            total={staffTotal}
            percentage={staffPercentage}
            submittedAt={evaluation.staff_submitted_at}
            submittedLabel={tr.submittedOn}
          />
          <ScoreSummaryCard
            title={tr.supervisorAssessment}
            icon={UserCheck}
            identityTone="success"
            total={supervisorTotal}
            percentage={supervisorPercentage}
            submittedAt={evaluation.supervisor_submitted_at}
            submittedLabel={tr.submittedOn}
          />
        </div>

        {/* Spider Chart — chart colours unchanged until the phase-4 chart rework */}
        <Card>
          <CardHeader>
            <CardTitle>{tr.chartTitle}</CardTitle>
            <CardDescription>{tr.chartDescription}</CardDescription>
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
                    name={tr.chartStaff}
                    dataKey="staff"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name={tr.chartSupervisor}
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
                          <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
                            <p className="mb-2 text-sm font-semibold">{label}</p>
                            {payload.map((entry: any, index: number) => (
                              <p key={index} className="text-sm" style={{ color: entry.color }}>
                                {entry.name}: {tr.level(entry.value)}
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
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{tr.breakdownTitle}</CardTitle>
            <CardDescription>{tr.breakdownDescription}</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">#</TableHead>
                <TableHead>{tr.colCompetency}</TableHead>
                <TableHead className="text-right">{tr.staff}</TableHead>
                <TableHead className="text-right">{t.common.supervisor}</TableHead>
                <TableHead className="text-right">{tr.colDifference}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ANNUAL_EVALUATION_QUESTIONS.map((q, index) => {
                const staffScore = SCORE_MAP[staffAnswers[q.id]] || 0;
                const supervisorScore = SCORE_MAP[supervisorAnswers[q.id]] || 0;
                const difference = supervisorScore - staffScore;
                const differenceTone: StatusTone = difference > 0 ? 'success' : difference < 0 ? 'danger' : 'muted';

                return (
                  <TableRow key={q.id}>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      {/* Question text is official BM content — not translated. */}
                      <p className="font-medium">{q.shortLabel}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{q.question}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <ToneBadge tone={getRatingLevelTone(staffAnswers[q.id])} className="tabular-nums">
                        {staffScore}/10
                      </ToneBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ToneBadge tone={getRatingLevelTone(supervisorAnswers[q.id])} className="tabular-nums">
                        {supervisorScore}/10
                      </ToneBadge>
                    </TableCell>
                    <TableCell className={cn('text-right font-medium tabular-nums', toneClasses[differenceTone].text)}>
                      {difference > 0 ? '+' : ''}
                      {difference}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
}
