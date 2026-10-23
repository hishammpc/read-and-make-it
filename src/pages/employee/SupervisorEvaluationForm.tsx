import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { LevelRadioGroup } from '@/components/common/LevelRadioGroup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Info,
  CheckCircle2,
  Clock,
  Send,
  SearchX,
  Lock,
  User,
} from 'lucide-react';
import { useSubmitSupervisorEvaluation } from '@/hooks/useAnnualEvaluations';
import { embeddedCycle, getCycleState } from '@/lib/annualCycle';
import { getRatingLevelTone } from '@/lib/status';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  getQuestionsByCategory,
} from '@/lib/annualEvaluationQuestions';

export default function SupervisorEvaluationForm() {
  const navigate = useNavigate();
  const { cycleId, userId } = useParams<{ cycleId: string; userId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const ta = t.employee.annual;
  const tf = t.employee.supervisorForm;
  const supervisorId = user?.userId || '';
  const submitEvaluation = useSubmitSupervisorEvaluation();

  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Fetch the evaluation — scoped to the logged-in supervisor, so anyone else
  // opening this URL gets "not found" instead of the form.
  const { data: evaluation, isLoading, error } = useQuery({
    queryKey: ['supervisor-evaluation-form', cycleId, userId, supervisorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position),
          cycle:cycle_id(id, year, start_date, end_date, status, window_mode, skipped_at)
        `)
        .eq('cycle_id', cycleId)
        .eq('user_id', userId)
        .eq('supervisor_id', supervisorId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!cycleId && !!userId && !!supervisorId,
  });

  const backTo = '/dashboard/supervisee-evaluations';

  if (error) {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={ta.supervisorEvaluation} backTo={backTo} />
          <ErrorState message={(error as Error).message} />
        </div>
      </EmployeeLayout>
    );
  }

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="form" />
      </EmployeeLayout>
    );
  }

  if (!evaluation) {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={ta.supervisorEvaluation} backTo={backTo} />
          <EmptyState icon={SearchX} title={ta.notFoundTitle} description={ta.notFoundDescription} />
        </div>
      </EmployeeLayout>
    );
  }

  const backToListButton = (
    <Button variant="outline" onClick={() => navigate('/dashboard/supervisee-evaluations')}>
      {tf.backToList}
    </Button>
  );

  // Check if already submitted
  if (evaluation.status === 'completed') {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={ta.supervisorEvaluation} backTo={backTo} />
          <EmptyState
            icon={CheckCircle2}
            title={tf.completedTitle}
            description={tf.completedDescription}
            action={backToListButton}
          />
        </div>
      </EmployeeLayout>
    );
  }

  // Check if staff hasn't submitted yet
  if (evaluation.status === 'pending_staff') {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={ta.supervisorEvaluation} backTo={backTo} />
          <EmptyState
            icon={Clock}
            title={tf.pendingStaffTitle}
            description={tf.pendingStaffDescription}
            action={backToListButton}
          />
        </div>
      </EmployeeLayout>
    );
  }

  // Only while the cycle is open (within its dates or opened manually, not skipped)
  const cycle = embeddedCycle(evaluation);
  if (!getCycleState(cycle).isOpen) {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={ta.supervisorEvaluation} backTo={backTo} />
          <EmptyState
            icon={Lock}
            title={ta.closedTitle(cycle?.year ?? '')}
            description={ta.closedSupervisorDescription}
            action={backToListButton}
          />
        </div>
      </EmployeeLayout>
    );
  }

  const staffAnswers = (evaluation.staff_answers || {}) as Record<string, number>;

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < ANNUAL_EVALUATION_QUESTIONS.length) {
      return;
    }

    await submitEvaluation.mutateAsync({
      evaluationId: evaluation.id,
      supervisorId,
      answers,
    });

    navigate('/dashboard/supervisee-evaluations');
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = ANNUAL_EVALUATION_QUESTIONS.length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;
  const allAnswered = answeredCount === totalQuestions;

  const questionsByCategory = getQuestionsByCategory();

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          className="mb-0"
          title={ta.supervisorEvaluation}
          description={ta.year((evaluation.cycle as any)?.year)}
          backTo={backTo}
        />

        {/* Staff member */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{ta.staff}</p>
              <p className="font-semibold">{(evaluation.profiles as any)?.name}</p>
              <p className="text-sm text-muted-foreground">
                {(evaluation.profiles as any)?.position || '-'} • {(evaluation.profiles as any)?.department || '-'}
              </p>
            </div>
          </div>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tf.progress}</span>
                <span className="font-medium tabular-nums">{ta.answeredOf(answeredCount, totalQuestions)}</span>
              </div>
              <Progress value={progressPercentage} aria-label={tf.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {tf.staffAnswerHint}{' '}
            <ToneBadge tone="info" className="align-middle">{tf.staffAnswer}</ToneBadge>. {tf.instructions}
          </AlertDescription>
        </Alert>

        {/* Questions by category (official BM content) */}
        {Object.entries(questionsByCategory).map(([category, questions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>{ta.questionCount(questions.length)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {questions.map((q, qIndex) => {
                const staffAnswer = staffAnswers[q.id];
                const staffLevel = q.levels.find((l) => l.tahap === staffAnswer);

                return (
                  <div key={q.id} className="space-y-4">
                    <div className="border-b pb-4">
                      <p className="font-medium">
                        {q.categoryShort}{qIndex + 1}. {q.shortLabel}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {q.question}
                      </p>
                      {/* Staff member's own answer */}
                      {staffLevel && (
                        <div className="mt-3 rounded-lg border bg-muted/50 p-3">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <ToneBadge tone="info">{tf.staffAnswer}</ToneBadge>
                            <ToneBadge tone={getRatingLevelTone(staffLevel.tahap)}>{ta.level(staffLevel.tahap)}</ToneBadge>
                          </div>
                          <p className="text-sm">{staffLevel.description}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p id={`${q.id}-sup-label`} className="mb-3 text-sm font-medium">
                        {tf.yourRating}
                      </p>
                      <LevelRadioGroup
                        idPrefix={`${q.id}-sup`}
                        levels={q.levels}
                        value={answers[q.id]}
                        onChange={(level) => handleAnswerChange(q.id, level)}
                        labelledBy={`${q.id}-sup-label`}
                        renderMeta={(level) => tf.marks(level.marks)}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Submit */}
        <Card className="sticky bottom-4 border-primary/20 bg-background/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">
                {allAnswered ? (
                  <span className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {ta.allAnswered}
                  </span>
                ) : (
                  <span className="text-warning">{ta.remaining(totalQuestions - answeredCount)}</span>
                )}
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitEvaluation.isPending}
                size="lg"
              >
                {submitEvaluation.isPending ? (
                  t.common.submitting
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {ta.submit}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
