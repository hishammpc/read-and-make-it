import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
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
  Send,
  SearchX,
} from 'lucide-react';
import { useMyAnnualEvaluation, useSubmitStaffEvaluation } from '@/hooks/useAnnualEvaluations';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  getQuestionsByCategory,
} from '@/lib/annualEvaluationQuestions';

export default function AnnualEvaluationForm() {
  const navigate = useNavigate();
  const { cycleId } = useParams<{ cycleId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const ta = t.employee.annual;
  const tf = t.employee.annualForm;
  const { data: evaluation, isLoading, error } = useMyAnnualEvaluation(user?.userId || '', cycleId);
  const submitEvaluation = useSubmitStaffEvaluation();

  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (error) {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={tf.title} backTo="/dashboard" />
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
          <PageHeader title={tf.title} backTo="/dashboard" />
          <EmptyState icon={SearchX} title={ta.notFoundTitle} description={ta.notFoundDescription} />
        </div>
      </EmployeeLayout>
    );
  }

  // Check if already submitted
  if (evaluation.status !== 'pending_staff') {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={tf.title} backTo="/dashboard" />
          <EmptyState
            icon={CheckCircle2}
            title={tf.submittedTitle}
            description={tf.submittedDescription}
            action={
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {tf.viewStatus}
              </Button>
            }
          />
        </div>
      </EmployeeLayout>
    );
  }

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < ANNUAL_EVALUATION_QUESTIONS.length) {
      return; // Not all questions answered
    }

    await submitEvaluation.mutateAsync({
      evaluationId: evaluation.id,
      userId: user?.userId || '',
      answers,
    });

    navigate('/dashboard');
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = ANNUAL_EVALUATION_QUESTIONS.length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;
  const allAnswered = answeredCount === totalQuestions;

  const questionsByCategory = getQuestionsByCategory();
  const supervisorName = (evaluation.supervisor as any)?.name;

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          className="mb-0"
          title={tf.title}
          description={
            <>
              {ta.year((evaluation.cycle as any)?.year)}
              {supervisorName && (
                <>
                  {' · '}
                  {t.common.supervisor}: <span className="font-medium text-foreground">{supervisorName}</span>
                </>
              )}
            </>
          }
          backTo="/dashboard"
        />

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{ta.progress}</span>
                <span className="font-medium tabular-nums">{ta.answeredOf(answeredCount, totalQuestions)}</span>
              </div>
              <Progress value={progressPercentage} aria-label={ta.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{tf.instructions(totalQuestions)}</AlertDescription>
        </Alert>

        {/* Questions by category (official BM content) */}
        {Object.entries(questionsByCategory).map(([category, questions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>{ta.questionCount(questions.length)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {questions.map((q, qIndex) => (
                <div key={q.id} className="space-y-4">
                  <div className="border-b pb-4">
                    <p id={`${q.id}-label`} className="font-medium">
                      {q.categoryShort}{qIndex + 1}. {q.shortLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {q.question}
                    </p>
                  </div>

                  <LevelRadioGroup
                    idPrefix={`${q.id}`}
                    levels={q.levels}
                    value={answers[q.id]}
                    onChange={(level) => handleAnswerChange(q.id, level)}
                    labelledBy={`${q.id}-label`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Submit */}
        <Card className="sticky bottom-4 border-primary/20 bg-background/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
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
                {allAnswered && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-warning-soft-foreground">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-4 w-4 shrink-0 animate-pulse items-center justify-center rounded-full bg-warning text-xs font-semibold text-warning-foreground"
                    >
                      !
                    </span>
                    {tf.notifySupervisor}
                  </p>
                )}
              </div>
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
