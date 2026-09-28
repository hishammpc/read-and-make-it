import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toneClasses, type StatusTone } from '@/lib/status';

const TINTED_CARD: Record<StatusTone, string> = {
  success: 'border-success/30 bg-success-soft text-success-soft-foreground',
  warning: 'border-warning/30 bg-warning-soft text-warning-soft-foreground',
  info: 'border-info/30 bg-info-soft text-info-soft-foreground',
  danger: 'border-destructive/30 bg-destructive-soft text-destructive-soft-foreground',
  muted: 'bg-muted',
  primary: 'border-primary/20 bg-primary/5',
};

interface CalloutProps {
  tone: StatusTone;
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Extra body content under the description. */
  children?: ReactNode;
  /** Button(s) on the right; wraps under the text on small screens. */
  action?: ReactNode;
  /** `tinted` = coloured card for "something needs you"; `plain` = neutral card with a coloured icon. */
  variant?: 'tinted' | 'plain';
  className?: string;
}

/** Card-sized notice with an icon, title, body and optional action. */
export function Callout({
  tone,
  icon: Icon,
  title,
  description,
  children,
  action,
  variant = 'tinted',
  className,
}: CalloutProps) {
  const tinted = variant === 'tinted';
  // Neutral-ground tints keep body text muted; coloured tints inherit their soft foreground.
  const bodyMuted = !tinted || tone === 'primary' || tone === 'muted';

  return (
    <Card className={cn('p-5', tinted && TINTED_CARD[tone], className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            tinted ? toneClasses[tone].solid : toneClasses[tone].soft
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className={cn('text-sm', bodyMuted && 'text-muted-foreground')}>{description}</p>}
          {children && <div className={cn('space-y-1 pt-1 text-sm', bodyMuted && 'text-muted-foreground')}>{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Card>
  );
}

/** Inline, single-line-ish notice inside a card or form (status message, unsaved changes…). */
export function Notice({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: StatusTone;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn('flex items-start gap-3 rounded-lg border p-4 text-sm', TINTED_CARD[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
