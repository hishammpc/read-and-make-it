import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useProgramEvaluationTemplate, useSubmitEvaluation } from '@/hooks/useEvaluations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { EvaluationQuestionRenderer } from '@/components/evaluations/EvaluationQuestionRenderer';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Question {
  id: string;
  text: string;
  type: 'likert' | 'radio' | 'checkbox' | 'text';
  options?: string[];
  required?: boolean;
}

export default function EvaluationForm() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: template, isLoading: templateLoading } = useProgramEvaluationTemplate(
    programId || ''
  );

  // Fetch program details
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  const submitEvaluation = useSubmitEvaluation();

  const form = useForm({
    defaultValues: {},
  });

  const questions: Question[] = template?.questions || [];

  const onSubmit = async (data: any) => {
    if (!user || !programId) return;

    // Transform form data to answers object
    const answers: Record<string, any> = {};
    questions.forEach((_, index) => {
      const key = `q${index}`;
      if (data[key] !== undefined) {
        answers[key] = data[key];
      }
    });

    await submitEvaluation.mutateAsync({
      userId: user.id,
      evaluation: {
        program_id: programId,
        template_id: template?.id,
        answers,
      },
    });

    navigate('/dashboard/my-evaluations');
  };

  if (templateLoading || programLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="flex items-center h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/my-evaluations')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold ml-4">Program Evaluation</h1>
          </div>
        </header>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading evaluation form...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="flex items-center h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/my-evaluations')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold ml-4">Program Evaluation</h1>
          </div>
        </header>
        <div className="p-8">
          <Card>
            <CardHeader>
              <CardTitle>No Evaluation Template Found</CardTitle>
              <CardDescription>
                This program does not have an evaluation template set up yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/dashboard/my-evaluations')}>
                Back to Evaluations
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center h-16 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/my-evaluations')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold ml-4">Program Evaluation</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Program Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{program?.title}</CardTitle>
              <CardDescription>
                Please take a moment to evaluate this training program. Your feedback helps us
                improve future sessions.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Evaluation Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{template.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {questions.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        This evaluation template has no questions configured.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    questions.map((question, index) => (
                      <div key={question.id || index} className="pb-6 border-b last:border-b-0 last:pb-0">
                        <EvaluationQuestionRenderer
                          question={question}
                          control={form.control}
                          index={index}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {questions.length > 0 && (
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/my-evaluations')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitEvaluation.isPending}>
                    {submitEvaluation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Evaluation
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
