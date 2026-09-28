import { ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileCheck,
  FileText,
  ClipboardCheck,
  Send,
  LogOut,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppShell, type NavSection } from '@/components/layout/AppShell';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';

const ADMIN_PIN = '101010';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    // Check if PIN was already verified in this session
    const verified = sessionStorage.getItem('adminPinVerified');
    if (verified === 'true') {
      setIsPinVerified(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsPinVerified(true);
      sessionStorage.setItem('adminPinVerified', 'true');
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  // PIN verification screen
  if (!isPinVerified) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-muted/40 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)] p-4">
        <LanguageSwitch className="absolute right-4 top-4" />
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-card">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">{t.pin.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.pin.subtitle}</p>

          <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-pin" className="sr-only">
                {t.pin.label}
              </Label>
              <Input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError(false);
                }}
                aria-invalid={pinError}
                aria-describedby={pinError ? 'admin-pin-error' : undefined}
                className={`h-12 text-center text-lg tracking-[0.5em] ${pinError ? 'border-destructive' : ''}`}
                maxLength={6}
                autoFocus
              />
              {pinError && (
                <p id="admin-pin-error" className="text-sm text-destructive">
                  {t.pin.wrong}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">
              {t.pin.submit}
            </Button>
            {/* signOut → logout() also clears the PIN unlock */}
            <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {t.common.signOut}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const sections: NavSection[] = [
    { items: [{ icon: LayoutDashboard, label: t.nav.dashboard, path: '/dashboard' }] },
    {
      title: t.nav.sectionTraining,
      items: [
        { icon: BookOpen, label: t.nav.programs, path: '/dashboard/programs' },
        { icon: FileCheck, label: t.nav.trainingEvaluation, path: '/dashboard/evaluations' },
        { icon: Send, label: t.nav.proposedTrainings, path: '/dashboard/proposed-trainings' },
        { icon: FileText, label: t.nav.reports, path: '/dashboard/reports' },
      ],
    },
    {
      title: t.nav.sectionStaff,
      items: [
        { icon: Users, label: t.nav.users, path: '/admin/users' },
        { icon: ClipboardCheck, label: t.nav.annualEvaluation, path: '/dashboard/annual-evaluations' },
      ],
    },
  ];

  return <AppShell sections={sections}>{children}</AppShell>;
}
