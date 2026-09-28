import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

// Built per language so validation messages follow the UI language.
const makeUserFormSchema = (messages: { nameMin: string; emailInvalid: string }) =>
  z.object({
    name: z.string().min(2, messages.nameMin),
    email: z.string().email(messages.emailInvalid),
    position: z.string().optional(),
  });

export type UserFormValues = z.infer<ReturnType<typeof makeUserFormSchema>>;

interface UserFormProps {
  defaultValues?: Partial<UserFormValues>;
  onSubmit: (values: UserFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function UserForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel,
}: UserFormProps) {
  const { t } = useLanguage();
  const tf = t.adminStaff.userForm;
  const userFormSchema = useMemo(() => makeUserFormSchema(tf), [tf]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      email: defaultValues?.email || '',
      position: defaultValues?.position || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tf.nameLabel}</FormLabel>
                <FormControl>
                  <Input placeholder={tf.namePlaceholder} autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tf.emailLabel}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={tf.emailPlaceholder}
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{tf.positionLabel}</FormLabel>
                <FormControl>
                  <Input placeholder={tf.positionPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? t.common.saving : submitLabel ?? t.common.submit}
          </Button>
        </div>
      </form>
    </Form>
  );
}
