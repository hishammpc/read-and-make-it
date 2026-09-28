import { useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge, ToneBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
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
import { getRatingLevelTone, getRatingPercentageTone, toneClasses, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  calculateTotalScore,
  calculatePercentage,
  getRatingLabel,
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
                      name={ta.chartStaff}
                      dataKey="staff"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name={ta.chartSupervisor}
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
                                  {entry.name}: {ta.level(entry.value)}
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

/** Self / supervisor score summary; shows the pending status until that side has answered. */
function ScoreCard({
  label,
  icon,
  tone,
  score,
  pendingStatus,
}: {
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
  score: { total: number; percentage: number; submittedAt?: string | null } | null;
  pendingStatus?: 'pending_staff' | 'pending_supervisor';
}) {
  const { t } = useLanguage();

  if (!score) {
    return (
      <StatCard label={label} icon={icon} tone="muted" value="—">
        {pendingStatus && <StatusBadge kind="annualEvaluation" status={pendingStatus} />}
      </StatCard>
    );
  }

  const rating = getRatingLabel(score.percentage);
  return (
    <StatCard
      label={label}
      icon={icon}
      tone={tone}
      value={
        <>
          {score.total}
          <span className="text-base font-normal text-muted-foreground">/100</span>
        </>
      }
      hint={score.submittedAt ? t.employee.annual.submittedOn(formatMalaysianDate(score.submittedAt)) : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge tone={getRatingPercentageTone(score.percentage)}>{rating.label}</ToneBadge>
        <span className="text-sm tabular-nums text-muted-foreground">{score.percentage}%</span>
      </div>
    </StatCard>
  );
}
