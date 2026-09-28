import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStatusTone, type StatusKind, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';

const TONE_VARIANT: Record<StatusTone, 'success' | 'warning' | 'info' | 'danger' | 'muted' | 'default'> = {
  success: 'success',
  warning: 'warning',
  info: 'info',
  danger: 'danger',
  muted: 'muted',
  primary: 'default',
};

/** Soft coloured badge for any tone, with an optional leading dot. */
export function ToneBadge({
  tone,
  children,
  dot = false,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge variant={TONE_VARIANT[tone]} className={cn('whitespace-nowrap', className)}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </Badge>
  );
}

/**
 * Domain status badge — colour and translated label both come from one place
 * (lib/status.ts + t.status), so a status looks and reads the same on every page.
 */
export function StatusBadge({ kind, status, className }: { kind: StatusKind; status: string | null | undefined; className?: string }) {
  const { t } = useLanguage();
  const labels = t.status[kind] as Record<string, string>;
  const label = (status && labels[status]) || status || '—';

  return (
    <ToneBadge tone={getStatusTone(kind, status)} dot className={className}>
      {label}
    </ToneBadge>
  );
}
