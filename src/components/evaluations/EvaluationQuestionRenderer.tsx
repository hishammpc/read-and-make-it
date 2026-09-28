import { Control } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

interface Question {
  id: string;
  text: string;
  type: 'likert' | 'radio' | 'checkbox' | 'text';
  options?: string[];
  required?: boolean;
}

interface EvaluationQuestionRendererProps {
  question: Question;
  control: Control<any>;
  index: number;
}

const LIKERT_VALUES = ['1', '2', '3', '4', '5'];

export function EvaluationQuestionRenderer({
  question,
  control,
  index,
}: EvaluationQuestionRendererProps) {
  const { t } = useLanguage();
  const tr = t.adminTraining.templates.renderer;
  const fieldName = `q${index}`;
  const likertOptions = LIKERT_VALUES.map((value, i) => ({ value, label: tr.likert[i] }));

  const renderQuestionInput = (field: any) => {
    switch (question.type) {
      case 'likert':
        return (
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="flex flex-col space-y-2"
          >
            {likertOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${fieldName}-${option.value}`} />
                <Label
                  htmlFor={`${fieldName}-${option.value}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'radio':
        return (
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="flex flex-col space-y-2"
          >
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldName}-${idx}`} />
                <Label
                  htmlFor={`${fieldName}-${idx}`}
                  className="font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="flex flex-col space-y-2">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`${fieldName}-${idx}`}
                  checked={Array.isArray(field.value) && field.value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValue = Array.isArray(field.value) ? field.value : [];
                    if (checked) {
                      field.onChange([...currentValue, option]);
                    } else {
                      field.onChange(currentValue.filter((v: string) => v !== option));
                    }
                  }}
                />
                <Label
                  htmlFor={`${fieldName}-${idx}`}
                  className="font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <Textarea
            {...field}
            placeholder={tr.textPlaceholder}
            className="min-h-[100px]"
          />
        );

      default:
        return null;
    }
  };

  return (
    <FormField
      control={control}
      name={fieldName}
      rules={{
        required: question.required ? tr.fieldRequired : false,
        validate: (value) => {
          if (!question.required) return true;
          if (question.type === 'checkbox') {
            return Array.isArray(value) && value.length > 0
              ? true
              : tr.selectAtLeastOne;
          }
          return value ? true : tr.fieldRequired;
        },
      }}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>
            {question.text}
            {question.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>{renderQuestionInput(field)}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
