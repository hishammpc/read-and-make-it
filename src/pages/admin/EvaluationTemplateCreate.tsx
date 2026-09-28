import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrograms } from '@/hooks/usePrograms';
import { useCreateEvaluationTemplate } from '@/hooks/useEvaluations';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
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
import { Save } from 'lucide-react';

export default function EvaluationTemplateCreate() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tt = t.adminTraining.templates;
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const createTemplate = useCreateEvaluationTemplate();

  const [title, setTitle] = useState('');
  const [programId, setProgramId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = tt.errors.titleRequired;
    }

    if (questions.length === 0) {
      newErrors.questions = tt.errors.questionsRequired;
    }

    questions.forEach((question, index) => {
      if (!question.text.trim()) {
        newErrors[`question-${index}`] = tt.errors.questionTextRequired(index + 1);
      }

      if (
        (question.type === 'radio' || question.type === 'checkbox') &&
        (!question.options || question.options.length === 0)
      ) {
        newErrors[`question-${index}-options`] =
          tt.errors.questionNeedsOption(index + 1);
      }

      if (
        (question.type === 'radio' || question.type === 'checkbox') &&
        question.options
      ) {
        const hasEmptyOption = question.options.some((opt) => !opt.trim());
        if (hasEmptyOption) {
          newErrors[`question-${index}-options`] =
            tt.errors.questionEmptyOption(index + 1);
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Convert questions to JSONB format
    const questionsData = questions.map(({ id, ...rest }) => rest);

    createTemplate.mutate(
      {
        title: title.trim(),
        program_id: programId || undefined,
        questions: questionsData,
      },
      {
        onSuccess: () => {
          navigate('/dashboard/evaluations');
        },
      }
    );
  };

  return (
    <AdminLayout>
      <PageHeader title={tt.createTitle} description={tt.createDescription} backTo="/dashboard/evaluations" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{tt.infoTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {tt.templateTitle} <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tt.templateTitlePlaceholder}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <p id="title-error" className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Program Selection */}
            <div className="space-y-2">
              <Label htmlFor="program">{tt.program}</Label>
              {/* Radix Select forbids value="": "none" stands in for "no program" */}
              <Select value={programId || 'none'} onValueChange={(v) => setProgramId(v === 'none' ? '' : v)}>
                <SelectTrigger id="program" aria-describedby="program-hint">
                  <SelectValue placeholder={tt.programPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tt.noProgram}</SelectItem>
                  {programsLoading ? (
                    <SelectItem value="loading" disabled>
                      {t.common.loading}
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
              <p id="program-hint" className="text-sm text-muted-foreground">{tt.programHint}</p>
            </div>
          </CardContent>
        </Card>

        {/* Questions Builder */}
        <Card>
          <CardHeader>
            <CardTitle>
              {tt.questions} <span className="text-destructive" aria-hidden="true">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EvaluationTemplateBuilder questions={questions} onChange={setQuestions} />
            {errors.questions && (
              <p className="mt-4 text-sm text-destructive">{errors.questions}</p>
            )}
            {Object.entries(errors).map(([key, value]) => {
              if (key.startsWith('question-')) {
                return (
                  <p key={key} className="mt-2 text-sm text-destructive">
                    {value}
                  </p>
                );
              }
              return null;
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/evaluations')}
          >
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={createTemplate.isPending}>
            <Save className="h-4 w-4" />
            {createTemplate.isPending ? tt.creating : tt.create}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
