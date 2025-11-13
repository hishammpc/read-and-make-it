import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePrograms } from '@/hooks/usePrograms';
import {
  useEvaluationTemplate,
  useUpdateEvaluationTemplate,
} from '@/hooks/useEvaluations';
import AdminLayout from '@/components/layout/AdminLayout';
import EvaluationTemplateBuilder, {
  Question,
} from '@/components/evaluations/EvaluationTemplateBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save } from 'lucide-react';

export default function EvaluationTemplateEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: template, isLoading: templateLoading } = useEvaluationTemplate(id || '');
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const updateTemplate = useUpdateEvaluationTemplate();

  const [title, setTitle] = useState('');
  const [programId, setProgramId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load template data
  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setProgramId(template.program_id || '');

      // Convert questions from JSONB to Question format with IDs
      if (Array.isArray(template.questions)) {
        const questionsWithIds = template.questions.map((q: any) => ({
          ...q,
          id: crypto.randomUUID(),
        }));
        setQuestions(questionsWithIds);
      }
    }
  }, [template]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Template title is required';
    }

    if (questions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }

    questions.forEach((question, index) => {
      if (!question.text.trim()) {
        newErrors[`question-${index}`] = `Question ${index + 1} text is required`;
      }

      if (
        (question.type === 'radio' || question.type === 'checkbox') &&
        (!question.options || question.options.length === 0)
      ) {
        newErrors[`question-${index}-options`] =
          `Question ${index + 1} must have at least one option`;
      }

      if (
        (question.type === 'radio' || question.type === 'checkbox') &&
        question.options
      ) {
        const hasEmptyOption = question.options.some((opt) => !opt.trim());
        if (hasEmptyOption) {
          newErrors[`question-${index}-options`] =
            `Question ${index + 1} has empty options`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !id) {
      return;
    }

    // Convert questions to JSONB format (remove temporary IDs)
    const questionsData = questions.map(({ id, ...rest }) => rest);

    updateTemplate.mutate(
      {
        id,
        updates: {
          title: title.trim(),
          program_id: programId || undefined,
          questions: questionsData,
        },
      },
      {
        onSuccess: () => {
          navigate('/dashboard/evaluations');
        },
      }
    );
  };

  if (templateLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout>
        <div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Template Not Found
                </h3>
                <p className="text-muted-foreground mb-4">
                  The evaluation template you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate('/dashboard/evaluations')}>
                  Back to Evaluations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/evaluations')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Evaluation Template</h1>
            <p className="text-muted-foreground">
              Update the evaluation form for your programs
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Template Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Post-Training Feedback Form"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              {/* Program Selection */}
              <div className="space-y-2">
                <Label htmlFor="program">
                  Program (Optional)
                  <span className="text-muted-foreground ml-2 text-sm">
                    Leave empty for reusable templates
                  </span>
                </Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger id="program">
                    <SelectValue placeholder="Select a program or leave empty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Reusable)</SelectItem>
                    {programsLoading ? (
                      <SelectItem value="" disabled>
                        Loading programs...
                      </SelectItem>
                    ) : (
                      programs?.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Questions Builder */}
          <Card>
            <CardHeader>
              <CardTitle>
                Questions <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EvaluationTemplateBuilder questions={questions} onChange={setQuestions} />
              {errors.questions && (
                <p className="text-sm text-destructive mt-4">{errors.questions}</p>
              )}
              {Object.entries(errors).map(([key, value]) => {
                if (key.startsWith('question-')) {
                  return (
                    <p key={key} className="text-sm text-destructive mt-2">
                      {value}
                    </p>
                  );
                }
                return null;
              })}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/evaluations')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateTemplate.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateTemplate.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
