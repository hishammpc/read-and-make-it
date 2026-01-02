import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Send,
  User,
} from 'lucide-react';
import { useSubmitSupervisorEvaluation } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  getQuestionsByCategory,
} from '@/lib/annualEvaluationQuestions';

export default function SupervisorEvaluationForm() {
  const navigate = useNavigate();
  const { cycleId, userId } = useParams<{ cycleId: string; userId: string }>();
  const submitEvaluation = useSubmitSupervisorEvaluation();

  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Fetch the evaluation
  const { data: evaluation, isLoading, error } = useQuery({
    queryKey: ['supervisor-evaluation-form', cycleId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position),
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
      <EmployeeLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Ralat memuatkan penilaian: {(error as Error).message}</AlertDescription>
        </Alert>
      </EmployeeLayout>
    );
  }

  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
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

  // Check if already submitted
  if (evaluation.status === 'completed') {
    return (
      <EmployeeLayout>
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Penilaian untuk kakitangan ini telah selesai.
            <Button
              variant="link"
              className="ml-2 p-0 h-auto text-green-700"
              onClick={() => navigate('/dashboard/supervisee-evaluations')}
            >
              Kembali ke senarai →
            </Button>
          </AlertDescription>
        </Alert>
      </EmployeeLayout>
    );
  }

  // Check if staff hasn't submitted yet
  if (evaluation.status === 'pending_staff') {
    return (
      <EmployeeLayout>
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            Kakitangan ini belum menghantar penilaian kendiri mereka.
            <Button
              variant="link"
              className="ml-2 p-0 h-auto text-yellow-700"
              onClick={() => navigate('/dashboard/supervisee-evaluations')}
            >
              Kembali ke senarai →
            </Button>
          </AlertDescription>
        </Alert>
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
      <div className="space-y-6 max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold tracking-tight">
              Penilaian Penyelia
            </h1>
            <p className="text-muted-foreground">
              Tahun {(evaluation.cycle as any)?.year}
            </p>
          </div>
        </div>

        {/* Staff Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Kakitangan</p>
                <p className="text-xl font-semibold text-blue-900">
                  {(evaluation.profiles as any)?.name}
                </p>
                <p className="text-sm text-blue-700">
                  {(evaluation.profiles as any)?.position || '-'} • {(evaluation.profiles as any)?.department || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kemajuan Penilaian</span>
                <span className="font-medium">{answeredCount}/{totalQuestions} soalan</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Anda boleh melihat jawapan kakitangan (ditanda <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700 text-xs">Jawapan Kakitangan</Badge>).
            Sila berikan penilaian anda berdasarkan prestasi sebenar kakitangan.
          </AlertDescription>
        </Alert>

        {/* Questions by Category */}
        {Object.entries(questionsByCategory).map(([category, questions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>{questions.length} soalan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {questions.map((q, qIndex) => {
                const staffAnswer = staffAnswers[q.id];
                const staffLevel = q.levels.find((l) => l.tahap === staffAnswer);

                return (
                  <div key={q.id} className="space-y-4">
                    <div className="border-b pb-4">
                      <p className="font-medium text-lg">
                        {q.categoryShort}{qIndex + 1}. {q.shortLabel}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {q.question}
                      </p>
                      {/* Staff's Answer */}
                      {staffLevel && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                              Jawapan Kakitangan
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                staffLevel.tahap === 5 ? 'bg-green-100 text-green-700 border-green-300' :
                                staffLevel.tahap === 4 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                staffLevel.tahap === 3 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                staffLevel.tahap === 2 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                'bg-red-100 text-red-700 border-red-300'
                              }`}
                            >
                              Tahap {staffLevel.tahap} - {staffLevel.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-700">{staffLevel.description}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-3 text-green-700">Penilaian Anda:</p>
                      <RadioGroup
                        value={answers[q.id]?.toString()}
                        onValueChange={(value) => handleAnswerChange(q.id, parseInt(value))}
                        className="space-y-3"
                      >
                        {q.levels.map((level) => (
                          <div
                            key={level.tahap}
                            className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                              answers[q.id] === level.tahap
                                ? level.tahap === 5 ? 'border-green-500 bg-green-50' :
                                  level.tahap === 4 ? 'border-blue-500 bg-blue-50' :
                                  level.tahap === 3 ? 'border-yellow-500 bg-yellow-50' :
                                  level.tahap === 2 ? 'border-orange-500 bg-orange-50' :
                                  'border-red-500 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <RadioGroupItem value={level.tahap.toString()} id={`${q.id}-sup-${level.tahap}`} />
                            <Label
                              htmlFor={`${q.id}-sup-${level.tahap}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={`${
                                    level.tahap === 5 ? 'bg-green-100 text-green-700 border-green-300' :
                                    level.tahap === 4 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                    level.tahap === 3 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                    level.tahap === 2 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                    'bg-red-100 text-red-700 border-red-300'
                                  }`}
                                >
                                  Tahap {level.tahap} - {level.label}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  ({level.marks} markah)
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {level.description}
                              </p>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Submit Section */}
        <Card className="sticky bottom-4 border-2 border-green-200 bg-background/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {allAnswered ? (
                    <span className="text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Semua soalan telah dijawab
                    </span>
                  ) : (
                    <span className="text-orange-600">
                      {totalQuestions - answeredCount} soalan belum dijawab
                    </span>
                  )}
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitEvaluation.isPending}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {submitEvaluation.isPending ? (
                  'Menghantar...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Hantar Penilaian
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
