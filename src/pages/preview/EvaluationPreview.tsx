import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, CheckCircle2, Target, Users, Lightbulb, ThumbsUp, Star, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Fixed evaluation questions with icons
const EVALUATION_QUESTIONS = [
  { id: 'q1', text: 'Program ini mencapai objektif', icon: Target },
  { id: 'q2', text: 'Tenaga pengajar yang berpengalaman', icon: Users },
  { id: 'q3', text: 'Bahan (Material) yang digunakan adalah maklumat terkini', icon: Lightbulb },
  { id: 'q4', text: 'Program ini bermanfaat', icon: Star },
  { id: 'q5', text: 'Program ini wajar diteruskan di masa akan datang', icon: ThumbsUp },
];

const RATING_OPTIONS = [
  {
    value: 'LEMAH',
    label: 'LEMAH',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    hoverBorder: 'hover:border-red-400',
    selectedBg: 'bg-red-500',
    selectedBorder: 'border-red-500',
    textColor: 'text-red-700 dark:text-red-300',
  },
  {
    value: 'SEDERHANA',
    label: 'SEDERHANA',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    hoverBorder: 'hover:border-yellow-400',
    selectedBg: 'bg-yellow-500',
    selectedBorder: 'border-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-300',
  },
  {
    value: 'BAGUS',
    label: 'BAGUS',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    hoverBorder: 'hover:border-green-400',
    selectedBg: 'bg-green-500',
    selectedBorder: 'border-green-500',
    textColor: 'text-green-700 dark:text-green-300',
  },
] as const;

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

export default function EvaluationPreview() {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    console.log('Form submitted:', data);
    toast({
      title: 'Penilaian Dihantar',
      description: 'Terima kasih atas maklum balas anda.',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between h-16 px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">Borang Penilaian</h1>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {answeredCount}/5 soalan
            </div>
            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${(answeredCount / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Program Info Card */}
          <Card className="border-0 shadow-md bg-primary text-primary-foreground">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm font-medium mb-1">
                <CheckCircle2 className="h-4 w-4" />
                BORANG PENILAIAN SELEPAS PROGRAM
              </div>
              <CardTitle className="text-2xl font-bold">
                Leadership Excellence Workshop 2025
              </CardTitle>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Maklum balas anda membantu kami meningkatkan kualiti program latihan
              </p>
            </CardHeader>
          </Card>

          {/* Evaluation Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Rating Questions 1-5 */}
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
                      <Card className={cn(
                        "border transition-all duration-300",
                        isAnswered
                          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                          : "border-slate-200 dark:border-slate-700"
                      )}>
                        <CardContent className="p-5">
                          <FormItem className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors",
                                isAnswered
                                  ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {index + 1}/5
                                  </span>
                                  {isAnswered && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                                <p className="text-sm font-medium text-foreground">
                                  {question.text}
                                </p>
                              </div>
                            </div>

                            <FormControl>
                              <div className="grid grid-cols-3 gap-3">
                                {RATING_OPTIONS.map((option) => {
                                  const isSelected = field.value === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => field.onChange(option.value)}
                                      className={cn(
                                        "flex items-center justify-center py-3 rounded-lg border-2 transition-all duration-200 font-semibold text-sm",
                                        isSelected
                                          ? `${option.selectedBg} ${option.selectedBorder} text-white shadow-md`
                                          : `${option.bgColor} ${option.borderColor} ${option.hoverBorder} ${option.textColor}`
                                      )}
                                    >
                                      {option.label}
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

              {/* Question 6 - Comments Card */}
              <Card className="border border-slate-200 dark:border-slate-700">
                <CardContent className="p-5">
                  <FormField
                    control={form.control}
                    name="q6"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 shrink-0">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                PILIHAN
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              Lain-lain komen atau cadangan
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Kongsi pendapat anda untuk membantu kami menambah baik program ini..."
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

              {/* Submit Section */}
              <Card className="border-0 shadow-md bg-slate-800 dark:bg-slate-700 text-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Sedia untuk hantar?</h3>
                      <p className="text-slate-300 text-sm">
                        {answeredCount === 5
                          ? "Semua soalan telah dijawab"
                          : `${5 - answeredCount} soalan lagi perlu dijawab`}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/dashboard')}
                        className="bg-transparent border-slate-600 text-white hover:bg-slate-700"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={form.formState.isSubmitting || answeredCount < 5}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {form.formState.isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Hantar Penilaian
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
