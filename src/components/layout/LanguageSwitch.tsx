import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'ms', label: 'BM' },
  { value: 'en', label: 'EN' },
];

/** Compact BM / EN segmented switch. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={t.common.language}
      className={cn('inline-flex h-9 items-center rounded-md border bg-muted/60 p-0.5 text-xs font-semibold', className)}
    >
      {OPTIONS.map((option) => {
        const active = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLanguage(option.value)}
            className={cn(
              'h-full rounded-[5px] px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
