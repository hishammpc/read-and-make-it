import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** Technical detail (e.g. error.message); shown under the friendly message. */
  message?: string;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

/** The one load-failure pattern. */
export function ErrorState({ message, title, onRetry, className }: ErrorStateProps) {
  const { t } = useLanguage();

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive-soft p-5 text-destructive-soft-foreground sm:flex-row sm:items-start',
        className
      )}
    >
      <AlertCircle className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title ?? t.common.errorLoading}</p>
        {message && <p className="mt-1 break-words text-sm opacity-80">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          <RotateCcw className="h-4 w-4" />
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}
