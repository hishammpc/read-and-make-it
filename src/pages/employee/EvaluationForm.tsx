import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmitEvaluation } from '@/hooks/useEvaluations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, Check, SearchX, Target, Lightbulb, Users, ThumbsUp, Star, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTrainingRatingTone, toneClasses } from '@/lib/status';
import { getEvaluationFormVersion } from '@/lib/evaluationForms';
import { ImprovementEvaluationForm } from '@/components/evaluations/ImprovementEvaluationForm';

// Fixed evaluation questions with icons
const EVALUATION_QUESTIONS = [
  { id: 'q1', text: 'Program ini mencapai objektif', icon: Target },
  { id: 'q2', text: 'Tenaga pengajar yang berpengalaman', icon: Users },
  { id: 'q3', text: 'Bahan (Material) yang digunakan adalah maklumat terkini', icon: Lightbulb },
  { id: 'q4', text: 'Program ini bermanfaat', icon: Star },
  { id: 'q5', text: 'Program ini wajar diteruskan di masa akan datang', icon: ThumbsUp },
];

// Official BM rating words; colour comes from the shared training-rating tone.
const RATING_OPTIONS = ['LEMAH', 'SEDERHANA', 'BAGUS'] as const;

// Form validation schema - all 5 questions required, q6 optional (comments)
const ratingEnum = ['LEMAH', 'SEDERHANA', 'BAGUS'] as const;
const evaluationSchema = z.object({
  q1: z.enum(ratingEnum, { required_error: 'Sila pilih penilaian' }),
  q2: z.enum(ratingEnum, { required_error: 'Sila pilih penilaian' }),
  q3: z.enum(ratingEnum, { required_error: 'Sila pilih penilaian' }),
  q4: z.enum(ratingEnum, { required_error: 'Sila pilih penilaian' }),
  q5: z.enum(ratingEnum, { required_error: 'Sila pilih penilaian' }),
  q6: z.string().optional(),
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

export default function EvaluationForm() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const tf = t.employee.evaluationForm;

  // Fetch program details
  const { data: program, isLoading: programLoading, error: programError } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      // maybeSingle: a missing program is `null` (shown as "not found" at once), not an
      // error that React Query retries three times first.
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  const submitEvaluation = useSubmitEvaluation();

  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      q6: '',
    },
  });

  const watchedValues = form.watch();
  const answeredCount = Object.keys(watchedValues).filter(
    key => key !== 'q6' && watchedValues[key as keyof EvaluationFormValues]
  ).length;

  const onSubmit = async (data: EvaluationFormValues) => {
    if (!user || !programId) return;

    await submitEvaluation.mutateAsync({
      userId: user.userId,
      evaluation: {
        program_id: programId,
        answers: data,
      },
    });

    navigate('/dashboard/my-evaluations');
  };

  if (programLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="form" />
      </EmployeeLayout>
    );
  }

  if (programError) {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={tf.title} backTo="/dashboard/my-evaluations" />
          <ErrorState message={(programError as Error).message} />
        </div>
      </EmployeeLayout>
    );
  }

  if (!program) {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={tf.title} backTo="/dashboard/my-evaluations" />
          <EmptyState
            icon={SearchX}
            title={tf.notFoundTitle}
            description={tf.notFoundDescription}
            action={
              <Button variant="outline" onClick={() => navigate('/dashboard/my-evaluations')}>
                {tf.backToList}
              </Button>
            }
          />
        </div>
      </EmployeeLayout>
    );
  }

  // Programs starting from 1 Jan 2027 use the before/after improvement form (v2)
  if (getEvaluationFormVersion(program.start_date_time) === 2) {
    return (
      <EmployeeLayout>
        <div className="mx-auto max-w-4xl">
          <PageHeader title={program.title} description={tf.v2Description} backTo="/dashboard/my-evaluations" />
          <ImprovementEvaluationForm
            submitting={submitEvaluation.isPending}
            onCancel={() => navigate('/dashboard/my-evaluations')}
            onSubmit={async (answers) => {
              if (!user || !programId) return;
              try {
                await submitEvaluation.mutateAsync({
                  userId: user.userId,
                  evaluation: { program_id: programId, answers },
                });
                navigate('/dashboard/my-evaluations');
              } catch {
                // useSubmitEvaluation already shows the error toast; stay on the form
              }
            }}
          />
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-4xl">
        <PageHeader title={program.title} description={tf.description} backTo="/dashboard/my-evaluations" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Rating questions (official BM text) */}
            {EVALUATION_QUESTIONS.map((question, index) => {
              const Icon = question.icon;
              const currentValue = watchedValues[question.id as keyof EvaluationFormValues];
              const isAnswered = !!currentValue;

              return (
                <FormField
                  key={question.id}
                  control={form.control}
                  name={question.id as keyof EvaluationFormValues}
                  render={({ field }) => (
                    <Card className={cn('transition-colors', isAnswered && 'border-success/40')}>
                      <CardContent className="p-5">
                        <FormItem className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                                isAnswered ? toneClasses.success.soft : 'bg-muted text-muted-foreground'
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                  {index + 1}/5
                                </span>
                                {isAnswered && (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                                    <span className="sr-only">{tf.answered}</span>
                                  </>
                                )}
                              </div>
                              <p id={`${question.id}-label`} className="text-sm font-medium">
                                {question.text}
                              </p>
                            </div>
                          </div>

                          <FormControl>
                            <div
                              role="group"
                              aria-labelledby={`${question.id}-label`}
                              className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"
                            >
                              {RATING_OPTIONS.map((option) => {
                                const isSelected = field.value === option;
                                const tone = getTrainingRatingTone(option);
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => field.onChange(option)}
                                    className={cn(
                                      'flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors',
                                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                      isSelected
                                        ? cn(toneClasses[tone].solid, 'border-transparent shadow-sm')
                                        : 'border-border bg-background text-foreground hover:bg-accent'
                                    )}
                                  >
                                    {isSelected ? (
                                      <Check className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                      <span
                                        aria-hidden="true"
                                        className={cn('h-2 w-2 rounded-full', toneClasses[tone].solid)}
                                      />
                                    )}
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </CardContent>
                    </Card>
                  )}
                />
              );
            })}

            {/* Question 6 - comments (optional) */}
            <Card>
              <CardContent className="p-5">
                <FormField
                  control={form.control}
                  name="q6"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1">
                            <span className="text-xs font-medium text-muted-foreground">{tf.optional}</span>
                          </div>
                          <FormLabel className="text-sm font-medium">Lain-lain komen atau cadangan</FormLabel>
                        </div>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder={tf.commentsPlaceholder}
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <Card className="bg-muted/40">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{tf.readyTitle}</h3>
                    <p
                      className={cn(
                        'text-sm',
                        answeredCount === 5 ? 'text-success' : 'text-muted-foreground'
                      )}
                    >
                      {answeredCount === 5 ? tf.allAnswered : tf.remaining(5 - answeredCount)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/dashboard/my-evaluations')}>
                      {t.common.cancel}
                    </Button>
                    <Button type="submit" disabled={submitEvaluation.isPending || answeredCount < 5}>
                      {submitEvaluation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {tf.submit}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </EmployeeLayout>
  );
}
