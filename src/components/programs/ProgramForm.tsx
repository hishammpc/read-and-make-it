import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const programSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  training_type: z.enum(['Local', 'International']),
  location: z.string().optional(),
  start_date_time: z.string().min(1, 'Start date is required'),
  end_date_time: z.string().min(1, 'End date is required'),
  hours: z.coerce.number().min(0, 'Hours must be positive'),
  notify_for_evaluation: z.boolean().default(false),
}).refine(
  (data) => new Date(data.end_date_time) > new Date(data.start_date_time),
  {
    message: 'End date must be after start date',
    path: ['end_date_time'],
  }
);

type ProgramFormValues = z.infer<typeof programSchema>;

interface ProgramFormProps {
  initialData?: Partial<ProgramFormValues>;
  onSubmit: (data: ProgramFormValues) => void;
  isLoading?: boolean;
}

export default function ProgramForm({ initialData, onSubmit, isLoading }: ProgramFormProps) {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Program title" {...field} />
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
                  <FormLabel>Training Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select training type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="International">International</SelectItem>
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
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter training location" {...field} />
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
                  <FormLabel>Start Date & Time *</FormLabel>
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
                  <FormLabel>End Date & Time *</FormLabel>
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
                  <FormLabel>Hours *</FormLabel>
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
                <FormLabel>
                  Memerlukan penilaian
                </FormLabel>
                <FormDescription>
                  Peserta perlu mengisi borang penilaian selepas program tamat
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Program' : 'Create Program'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
