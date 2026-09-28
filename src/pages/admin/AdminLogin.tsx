import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loginAdmin, type AuthErrorCode } from '@/lib/emailOnlyAuth';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const adminLoginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t.auth.invalidEmail),
        password: z.string().min(1, t.auth.passwordRequired),
      }),
    [t]
  );
  type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginAdmin(data.email, data.password);

      if (result.success && result.user) {
        // Update auth context
        setUser(result.user);
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(result.error ?? 'unexpected');
      }
    } catch (err) {
      setError('unexpected');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t.auth.adminTitle}
      subtitle={t.auth.adminSubtitle}
      footer={
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.auth.toEmployeeLogin}
        </Link>
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t.auth.errors[error]}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.auth.emailLabel}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder={t.auth.emailPlaceholder}
                    className="h-11"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.auth.passwordLabel}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="current-password"
                    placeholder={t.auth.passwordPlaceholder}
                    className="h-11"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="h-11 w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? t.auth.submitting : t.auth.adminSubmit}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
