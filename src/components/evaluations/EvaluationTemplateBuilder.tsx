import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trash2, Plus, GripVertical } from 'lucide-react';

export interface Question {
  id: string;
  type: 'likert' | 'radio' | 'checkbox' | 'text';
  text: string;
  required: boolean;
  options?: string[];
}

interface EvaluationTemplateBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export default function EvaluationTemplateBuilder({
  questions,
  onChange,
}: EvaluationTemplateBuilderProps) {
  const { t } = useLanguage();
  const tb = t.adminTraining.templates.builder;

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: 'likert',
      text: '',
      required: false,
      options: [],
    };
    onChange([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    onChange(
      questions.map((q) =>
        q.id === id ? { ...q, ...updates } : q
      )
    );
  };

  const addOption = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      updateQuestion(questionId, {
        options: [...(question.options || []), ''],
      });
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      updateQuestion(questionId, {
        options: question.options.filter((_, i) => i !== optionIndex),
      });
    }
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 cursor-move text-muted-foreground" aria-hidden="true" />
              <CardTitle className="flex-1">{tb.question(index + 1)}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeQuestion(question.id)}
                className="h-8 w-8 text-destructive hover:bg-destructive-soft hover:text-destructive"
                aria-label={tb.removeQuestion}
                title={tb.removeQuestion}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor={`question-${question.id}`}>{tb.questionText}</Label>
              <Textarea
                id={`question-${question.id}`}
                value={question.text}
                onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                placeholder={tb.questionTextPlaceholder}
                rows={2}
              />
            </div>

            {/* Question Type */}
            <div className="space-y-2">
              <Label htmlFor={`type-${question.id}`}>{tb.questionType}</Label>
              <Select
                value={question.type}
                onValueChange={(value: Question['type']) => {
                  const updates: Partial<Question> = { type: value };
                  if (value === 'radio' || value === 'checkbox') {
                    if (!question.options || question.options.length === 0) {
                      updates.options = [''];
                    }
                  } else {
                    updates.options = [];
                  }
                  updateQuestion(question.id, updates);
                }}
              >
                <SelectTrigger id={`type-${question.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="likert">{tb.types.likert}</SelectItem>
                  <SelectItem value="radio">{tb.types.radio}</SelectItem>
                  <SelectItem value="checkbox">{tb.types.checkbox}</SelectItem>
                  <SelectItem value="text">{tb.types.text}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options for Radio/Checkbox */}
            {(question.type === 'radio' || question.type === 'checkbox') && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{tb.options}</p>
                <div className="space-y-2">
                  {question.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) =>
                          updateOption(question.id, optionIndex, e.target.value)
                        }
                        placeholder={tb.option(optionIndex + 1)}
                        aria-label={tb.option(optionIndex + 1)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(question.id, optionIndex)}
                        className="shrink-0"
                        aria-label={tb.removeOption}
                        title={tb.removeOption}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(question.id)}
                >
                  <Plus className="h-4 w-4" />
                  {tb.addOption}
                </Button>
              </div>
            )}

            {/* Required Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`required-${question.id}`}
                checked={question.required}
                onCheckedChange={(checked) =>
                  updateQuestion(question.id, { required: checked as boolean })
                }
              />
              <Label
                htmlFor={`required-${question.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {tb.requiredQuestion}
              </Label>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="h-4 w-4" />
        {tb.addQuestion}
      </Button>
    </div>
  );
}
