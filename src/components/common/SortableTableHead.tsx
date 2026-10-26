import { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SortState } from '@/lib/sort';
import { cn } from '@/lib/utils';

/**
 * Column header that sorts the table when clicked. Pair with `useTableSort`.
 * Right-aligned (numeric) columns put the arrow before the label so the label
 * stays flush with the numbers below it.
 */
export function SortableTableHead<K extends string>({
  sortKey,
  sort,
  onSort,
  align = 'left',
  className,
  children,
}: {
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  align?: 'left' | 'right';
  className?: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
  const nextIsDescending = active && sort.direction === 'asc';

  return (
    <TableHead
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(align === 'right' && 'text-right', className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={nextIsDescending ? t.common.sortDescending : t.common.sortAscending}
        className={cn(
          '-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 text-left transition-colors',
          'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          align === 'right' && 'flex-row-reverse text-right',
          active && 'text-foreground'
        )}
      >
        <span>{children}</span>
        <Icon aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0', !active && 'opacity-50')} />
      </button>
    </TableHead>
  );
}
