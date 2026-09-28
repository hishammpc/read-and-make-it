import { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Split-screen frame for the sign-in pages: form on the left, product panel on large screens. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useLanguage();

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center rounded-md dark:bg-white dark:px-1.5 dark:py-1">
              <img src="/mpclogo.jpeg" alt="MPC" className="h-8 w-auto object-contain" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{t.common.appName}</span>
          </div>
          <LanguageSwitch />
        </div>

        <main className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm">{footer}</div>}
          </div>
        </main>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t.common.appName}
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-[hsl(222_32%_11%)] text-white lg:flex">
        {/* Faint grid + one soft glow; decorative only */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_right,hsl(0_0%_100%/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(0_0%_100%/0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
        />
        <div aria-hidden="true" className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[hsl(222_70%_50%/0.35)] blur-3xl" />

        <div className="relative mt-auto max-w-md p-12">
          <p className="text-3xl font-semibold leading-tight tracking-tight">{t.auth.panelHeading}</p>
          <ul className="mt-8 space-y-3.5">
            {t.auth.panelPoints.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-white/75">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(217_80%_70%)]" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
