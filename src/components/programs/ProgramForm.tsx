import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Dictionary } from '@/i18n/ms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ProgramFormErrors = Dictionary['adminTraining']['programForm']['errors'];

// Built per language so validation messages follow the UI language.
const buildProgramSchema = (e: ProgramFormErrors) =>
  z.object({
    title: z.string().min(1, e.titleRequired),
    training_type: z.enum(['Local', 'International']),
    location: z.string().optional(),
    start_date_time: z.string().min(1, e.startRequired),
    end_date_time: z.string().min(1, e.endRequired),
    hours: z.coerce.number().min(0, e.hoursNotNegative),
    notify_for_evaluation: z.boolean().default(false),
  }).refine(
    (data) => new Date(data.end_date_time) > new Date(data.start_date_time),
    {
      message: e.endAfterStart,
      path: ['end_date_time'],
    }
  );

type ProgramFormValues = z.infer<ReturnType<typeof buildProgramSchema>>;

const TRAINING_TYPES = ['Local', 'International'] as const;

function RequiredMark() {
  return <span className="text-destructive" aria-hidden="true"> *</span>;
}

interface ProgramFormProps {
  initialData?: Partial<ProgramFormValues>;
  onSubmit: (data: ProgramFormValues) => void;
  isLoading?: boolean;
}

export default function ProgramForm({ initialData, onSubmit, isLoading }: ProgramFormProps) {
  const { t } = useLanguage();
  const tf = t.adminTraining.programForm;
  const programSchema = useMemo(() => buildProgramSchema(tf.errors), [tf]);

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      title: initialData?.title || '',
      training_type: initialData?.training_type || 'Local',
      location: initialData?.location || '',
      start_date_time: initialData?.start_date_time || '',
      end_date_time: initialData?.end_date_time || '',
      hours: initialData?.hours || 0,
      notify_for_evaluation: initialData?.notify_for_evaluation || false,
    },
  });

  const trainingType = form.watch('training_type');

  // Append local timezone offset to datetime-local strings so PostgreSQL
  // stores them correctly as timestamptz (instead of assuming UTC)
  const handleSubmit = (data: ProgramFormValues) => {
    const offset = new Date().getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const absH = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const absM = String(Math.abs(offset) % 60).padStart(2, '0');
    const tz = `${sign}${absH}:${absM}`;
    onSubmit({
      ...data,
      start_date_time: data.start_date_time + tz,
      end_date_time: data.end_date_time + tz,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>
                  {tf.title}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder={tf.titlePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2 grid gap-4 grid-cols-1 md:grid-cols-4">
            <FormField
              control={form.control}
              name="training_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {tf.trainingType}
                    <RequiredMark />
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={tf.trainingTypePlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRAINING_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {tf.trainingTypes[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {trainingType === 'International' && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>{tf.location}</FormLabel>
                    <FormControl>
                      <Input placeholder={tf.locationPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="md:col-span-2 grid gap-4 grid-cols-1 md:grid-cols-3">
            <FormField
              control={form.control}
              name="start_date_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {tf.start}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {tf.end}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {tf.hours}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Evaluation Requirement Checkbox */}
        <FormField
          control={form.control}
          name="notify_for_evaluation"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{tf.requiresEvaluation}</FormLabel>
                <FormDescription>{tf.requiresEvaluationHint}</FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t.common.saving : initialData ? tf.submitUpdate : tf.submitCreate}
          </Button>
        </div>
      </form>
    </Form>
  );
}
