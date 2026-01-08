import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { useMyAnnualEvaluation, useSubmitStaffEvaluation } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  RATING_LABELS,
  getQuestionsByCategory,
} from '@/lib/annualEvaluationQuestions';

export default function AnnualEvaluationForm() {
  const navigate = useNavigate();
  const { cycleId } = useParams<{ cycleId: string }>();
  const { user } = useAuth();
  const { data: evaluation, isLoading, error } = useMyAnnualEvaluation(user?.userId || '', cycleId);
  const submitEvaluation = useSubmitStaffEvaluation();

  const [answers, setAnswers] = useState<Record<string, number>>({});

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
  if (evaluation.status !== 'pending_staff') {
    return (
      <EmployeeLayout>
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Penilaian kendiri anda telah dihantar.
            <Button
              variant="link"
              className="ml-2 p-0 h-auto text-green-700"
              onClick={() => navigate('/dashboard/my-annual-evaluation')}
            >
              Lihat status →
            </Button>
          </AlertDescription>
        </Alert>
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
      answers,
    });

    navigate('/dashboard/my-annual-evaluation');
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
            onClick={() => navigate('/dashboard/my-annual-evaluation')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Penilaian Kendiri Tahunan
            </h1>
            <p className="text-muted-foreground">
              Tahun {(evaluation.cycle as any)?.year}
            </p>
            {(evaluation.supervisor as any)?.name && (
              <p className="text-sm text-muted-foreground">
                Penyelia: <span className="font-medium">{(evaluation.supervisor as any).name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kemajuan</span>
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
            Sila jawab semua {totalQuestions} soalan berdasarkan penilaian kendiri anda.
            Pilih tahap yang paling sesuai dengan kemampuan anda.
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
              {questions.map((q, qIndex) => (
                <div key={q.id} className="space-y-4">
                  <div className="border-b pb-4">
                    <p className="font-medium text-lg">
                      {q.categoryShort}{qIndex + 1}. {q.shortLabel}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {q.question}
                    </p>
                  </div>

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
                        <RadioGroupItem value={level.tahap.toString()} id={`${q.id}-${level.tahap}`} />
                        <Label
                          htmlFor={`${q.id}-${level.tahap}`}
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
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {level.description}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Submit Section */}
        <Card className="sticky bottom-4 border-2 border-primary/20 bg-background/95 backdrop-blur">
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
