import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReturnTo } from '@/hooks/useReturnTo';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons / controls on the right; wraps under the title on small screens. */
  actions?: ReactNode;
  /** Renders a back link above the title. Goes back to the list the user came from
   *  (with its filters) when the link that opened this page passed `useReturnState()`. */
  backTo?: string;
  backLabel?: string;
  className?: string;
}

/** The one page title pattern: optional back link, h1, description, actions. */
export function PageHeader({ title, description, actions, backTo, backLabel, className }: PageHeaderProps) {
  const { t } = useLanguage();
  const backHref = useReturnTo(backTo ?? '');

  return (
    <div className={cn('mb-6 space-y-3', className)}>
      {backTo && (
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel ?? t.common.back}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
