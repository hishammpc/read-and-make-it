import { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
}

/**
 * A select with a search box, for long lists (staff, supervisors). Looks like the
 * plain Select trigger. Options listed in `pinned` (e.g. "All", "None") stay at the top
 * and are never filtered out.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  pinned = [],
  placeholder,
  searchPlaceholder,
  ariaLabel,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  pinned?: SearchableOption[];
  placeholder: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = [...pinned, ...options].find((option) => option.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  const renderItem = (option: SearchableOption) => (
    <CommandItem key={option.value} value={option.value} onSelect={() => choose(option.value)}>
      <Check className={cn('mr-2 h-4 w-4 shrink-0', option.value === value ? 'opacity-100' : 'opacity-0')} />
      <span className="truncate">{option.label}</span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background transition-[border-color,box-shadow]',
            'focus:outline-none focus:border-ring focus:ring-4 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          <span className={cn('line-clamp-1', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder ?? t.common.search}
          />
          <CommandList>
            <CommandEmpty>{t.common.noResults}</CommandEmpty>
            {pinned.length > 0 && <CommandGroup>{pinned.map(renderItem)}</CommandGroup>}
            <CommandGroup>{filtered.map(renderItem)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
