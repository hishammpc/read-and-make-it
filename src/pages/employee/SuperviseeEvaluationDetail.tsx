import { useParams } from 'react-router-dom';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ScoreCard } from '@/components/common/ScoreCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchX, User, UserCheck } from 'lucide-react';
import { RadarScoreChart } from '@/components/charts/RadarScoreChart';
import { useAnnualEvaluationResult } from '@/hooks/useAnnualEvaluations';
import { getRatingLevelTone, toneClasses, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  calculateTotalScore,
  calculatePercentage,
} from '@/lib/annualEvaluationQuestions';

export default function SuperviseeEvaluationDetail() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const { t } = useLanguage();
  const ta = t.employee.annual;

  const { user } = useAuth();
  const { data, isLoading, error } = useAnnualEvaluationResult(evaluationId || '');
  // Only the assigned supervisor can view this result; anyone else gets "not found".
  const evaluation = data && data.supervisor_id === user?.userId ? data : null;

  const backTo = '/dashboard/supervisee-evaluations';

  if (error) {
    return (
      <EmployeeLayout>
        <PageHeader title={ta.resultTitle} backTo={backTo} />
        <ErrorState message={(error as Error).message} />
      </EmployeeLayout>
    );
  }

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="detail" />
      </EmployeeLayout>
    );
  }

  if (!evaluation) {
    return (
      <EmployeeLayout>
        <PageHeader title={ta.resultTitle} backTo={backTo} />
        <EmptyState icon={SearchX} title={ta.notFoundTitle} description={ta.notFoundDescription} />
      </EmployeeLayout>
    );
  }

  const header = (
    <PageHeader
      title={ta.resultTitle}
      description={ta.annualYear((evaluation.cycle as any)?.year)}
      backTo={backTo}
    />
  );

  const staffAnswers = (evaluation.staff_answers || {}) as Record<string, number>;
  const supervisorAnswers = (evaluation.supervisor_answers || {}) as Record<string, number>;
  const hasStaffAnswers = Object.keys(staffAnswers).length > 0;
  const hasSupervisorAnswers = Object.keys(supervisorAnswers).length > 0;

  const staffTotal = hasStaffAnswers ? calculateTotalScore(staffAnswers) : 0;
  const staffPercentage = hasStaffAnswers ? calculatePercentage(staffAnswers) : 0;

  const supervisorTotal = hasSupervisorAnswers ? calculateTotalScore(supervisorAnswers) : 0;
  const supervisorPercentage = hasSupervisorAnswers ? calculatePercentage(supervisorAnswers) : 0;

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
      {header}

      <div className="space-y-6">
        {/* Staff member */}
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{ta.staff}</p>
              <p className="font-semibold">{(evaluation.profiles as any)?.name}</p>
              <p className="text-sm text-muted-foreground">
                {(evaluation.profiles as any)?.position || ''}{' '}
                {(evaluation.profiles as any)?.department ? `· ${(evaluation.profiles as any).department}` : ''}
              </p>
            </div>
          </div>
        </Card>

        {/* Score summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ScoreCard
            label={ta.selfEvaluation}
            icon={User}
            tone="info"
            score={
              hasStaffAnswers
                ? { total: staffTotal, percentage: staffPercentage, submittedAt: evaluation.staff_submitted_at }
                : null
            }
            pendingStatus="pending_staff"
          />
          <ScoreCard
            label={ta.supervisorEvaluation}
            icon={UserCheck}
            tone="success"
            score={
              hasSupervisorAnswers
                ? {
                    total: supervisorTotal,
                    percentage: supervisorPercentage,
                    submittedAt: evaluation.supervisor_submitted_at,
                  }
                : null
            }
            pendingStatus="pending_supervisor"
          />
        </div>

        {/* Spider chart — only once both have answered (chart internals unchanged until phase 4) */}
        {hasStaffAnswers && hasSupervisorAnswers && (
          <Card>
            <CardHeader>
              <CardTitle>{ta.chartTitle}</CardTitle>
              <CardDescription>{ta.chartDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] sm:h-[500px]">
                <RadarScoreChart
                  data={radarData}
                  series={[
                    { dataKey: 'staff', label: ta.chartStaff },
                    { dataKey: 'supervisor', label: ta.chartSupervisor },
                  ]}
                  max={5}
                  formatValue={ta.level}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed breakdown */}
        {hasStaffAnswers && (
          <Card>
            <CardHeader>
              <CardTitle>{ta.breakdownTitle}</CardTitle>
              <CardDescription>
                {hasSupervisorAnswers ? ta.breakdownCompare : ta.breakdownSelfOnly}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{ta.colCompetency}</TableHead>
                    <TableHead className="text-right">{ta.colStaff}</TableHead>
                    {hasSupervisorAnswers && (
                      <>
                        <TableHead className="text-right">{ta.colSupervisor}</TableHead>
                        <TableHead className="text-right">{ta.colDifference}</TableHead>
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
                        <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium">{q.shortLabel}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{q.question}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <ToneBadge tone={getRatingLevelTone(staffAnswers[q.id])} className="tabular-nums">
                            {staffScore}/10
                          </ToneBadge>
                        </TableCell>
                        {hasSupervisorAnswers && (
                          <>
                            <TableCell className="text-right">
                              <ToneBadge tone={getRatingLevelTone(supervisorAnswers[q.id])} className="tabular-nums">
                                {supervisorScore}/10
                              </ToneBadge>
                            </TableCell>
                            <TableCell
                              className={cn('text-right font-medium tabular-nums', toneClasses[differenceTone(difference)].text)}
                            >
                              {difference > 0 ? '+' : ''}
                              {difference}
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

function differenceTone(difference: number): StatusTone {
  if (difference > 0) return 'success';
  if (difference < 0) return 'danger';
  return 'muted';
}
