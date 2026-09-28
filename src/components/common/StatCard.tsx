import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toneClasses, type StatusTone } from '@/lib/status';

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  /** Colours the icon chip. */
  tone?: StatusTone;
  /** Small line under the value (context, unit, comparison). */
  hint?: ReactNode;
  /** Makes the whole card a button (keyboard accessible). */
  onClick?: () => void;
  /** For cards that act as filter toggles: rings the card in its tone and sets aria-pressed. */
  active?: boolean;
  /** Extra content under the hint, e.g. a progress bar. */
  children?: ReactNode;
  className?: string;
}

/** The one KPI card. Values keep proportional figures (tabular-nums is for table columns). */
export function StatCard({ label, value, icon: Icon, tone = 'primary', hint, onClick, active, children, className }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', toneClasses[tone].soft)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </>
  );

  const base = 'rounded-xl border bg-card p-5 text-left text-card-foreground shadow-card';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          base,
          'w-full transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active && toneClasses[tone].ring,
          className
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn(base, className)}>{content}</div>;
}
