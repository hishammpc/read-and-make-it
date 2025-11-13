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

const LIKERT_OPTIONS = [
  { value: '1', label: 'Strongly Disagree' },
  { value: '2', label: 'Disagree' },
  { value: '3', label: 'Neutral' },
  { value: '4', label: 'Agree' },
  { value: '5', label: 'Strongly Agree' },
];

export function EvaluationQuestionRenderer({
  question,
  control,
  index,
}: EvaluationQuestionRendererProps) {
  const fieldName = `q${index}`;

  const renderQuestionInput = (field: any) => {
    switch (question.type) {
      case 'likert':
        return (
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="flex flex-col space-y-2"
          >
            {LIKERT_OPTIONS.map((option) => (
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
            placeholder="Enter your response..."
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
        required: question.required ? 'This field is required' : false,
        validate: (value) => {
          if (!question.required) return true;
          if (question.type === 'checkbox') {
            return Array.isArray(value) && value.length > 0
              ? true
              : 'Please select at least one option';
          }
          return value ? true : 'This field is required';
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
