import { useId } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { WindowMode } from '@/lib/windowState';

const MODES: WindowMode[] = ['auto', 'open', 'closed'];

/** Admin manual override for a date-bound window: Ikut tarikh / Buka sekarang / Tutup sekarang. */
export function WindowModeControl({
  value,
  onChange,
  disabled = false,
}: {
  value: WindowMode;
  onChange: (mode: WindowMode) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const labels = t.common.windowMode;
  const labelId = useId();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span id={labelId} className="text-sm font-medium text-muted-foreground">
        {labels.control}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="inline-flex h-9 items-center rounded-md border bg-muted/60 p-0.5 text-xs font-medium"
      >
        {MODES.map((mode) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => !active && onChange(mode)}
              disabled={disabled}
              className={cn(
                'h-full rounded-[5px] px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {labels[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
