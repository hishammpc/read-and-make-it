import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAuthenticated } from '@/lib/emailOnlyAuth';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useLanguage();

  const loginSchema = useMemo(
    () => z.object({ email: z.string().email(t.auth.invalidEmail) }),
    [t]
  );
  type LoginFormData = z.infer<typeof loginSchema>;

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Check if user is already logged in
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    const result = await signIn(data.email);
    setLoading(false);

    if (!result.success) {
      toast.error(t.auth.errors[result.error ?? 'unexpected']);
      return;
    }

    toast.success(t.auth.welcome);
    navigate('/dashboard');
  };

  const emailError = loginForm.formState.errors.email;

  return (
    <AuthLayout title={t.auth.title} subtitle={t.auth.subtitle}>
      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.emailLabel}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder={t.auth.emailPlaceholder}
            className="h-11"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            {...loginForm.register('email')}
          />
          {emailError && (
            <p id="email-error" className="text-sm text-destructive">
              {emailError.message}
            </p>
          )}
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t.auth.submitting : t.auth.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
