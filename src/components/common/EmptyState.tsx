import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  /** Tighter version for inside a card or a table cell (no dashed frame). */
  compact?: boolean;
  className?: string;
}

/** The one "nothing here" pattern. Inside a table: <TableRow><TableCell colSpan={n}><EmptyState compact …/></TableCell></TableRow> */
export function EmptyState({ title, description, icon: Icon = Inbox, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-10' : 'rounded-xl border border-dashed bg-card/50 px-6 py-14',
        className
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
