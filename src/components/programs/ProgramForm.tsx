import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
  description: z.string().optional(),
  category: z.enum(['Technical', 'Leadership', 'Soft Skill', 'Mandatory', 'Others']),
  start_date_time: z.string().min(1, 'Start date is required'),
  end_date_time: z.string().min(1, 'End date is required'),
  location: z.string().optional(),
  organizer: z.string().optional(),
  trainer: z.string().optional(),
  hours: z.coerce.number().min(0, 'Hours must be positive'),
  status: z.enum(['Planned', 'Ongoing', 'Completed', 'Cancelled']).optional(),
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
      description: initialData?.description || '',
      category: initialData?.category || 'Technical',
      start_date_time: initialData?.start_date_time || '',
      end_date_time: initialData?.end_date_time || '',
      location: initialData?.location || '',
      organizer: initialData?.organizer || '',
      trainer: initialData?.trainer || '',
      hours: initialData?.hours || 0,
      status: initialData?.status || 'Planned',
    },
  });

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

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Program description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Leadership">Leadership</SelectItem>
                    <SelectItem value="Soft Skill">Soft Skill</SelectItem>
                    <SelectItem value="Mandatory">Mandatory</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Online or physical address" {...field} />
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

          <FormField
            control={form.control}
            name="organizer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organizer</FormLabel>
                <FormControl>
                  <Input placeholder="Organizer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="trainer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trainer</FormLabel>
                <FormControl>
                  <Input placeholder="Trainer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Program' : 'Create Program'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
