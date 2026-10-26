// Column sorting for tables. Pure functions so they can be unit-tested; the URL-backed
// state lives in hooks/useTableSort.ts and the header button in common/SortableTableHead.

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

export type SortValue = string | number | null | undefined;

/** How to read each sortable column's value from a row. Define it outside the component. */
export type SortAccessors<T, K extends string> = Record<K, (row: T) => SortValue>;

// Case- and accent-insensitive, and "Staff 2" before "Staff 10"
const collator = new Intl.Collator('ms', { sensitivity: 'base', numeric: true });

const isEmpty = (value: SortValue) => value === null || value === undefined || value === '';

/**
 * Returns a sorted copy. Empty values go last in both directions; ties keep the incoming
 * order (Array.prototype.sort is stable), so rows already ordered by name stay that way.
 */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  accessors: SortAccessors<T, K>,
  sort: SortState<K>
): T[] {
  const read = accessors[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((rowA, rowB) => {
    const a = read(rowA);
    const b = read(rowB);
    if (isEmpty(a) || isEmpty(b)) return isEmpty(a) === isEmpty(b) ? 0 : isEmpty(a) ? 1 : -1;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * sign;
    return collator.compare(String(a), String(b)) * sign;
  });
}

/** `hours` = ascending, `-hours` = descending — the form kept in the URL. */
export function formatSortParam<K extends string>(sort: SortState<K>): string {
  return sort.direction === 'desc' ? `-${sort.key}` : sort.key;
}

export function parseSortParam<K extends string>(
  param: string | null,
  keys: readonly K[],
  fallback: SortState<K>
): SortState<K> {
  if (!param) return fallback;
  const direction: SortDirection = param.startsWith('-') ? 'desc' : 'asc';
  const key = (direction === 'desc' ? param.slice(1) : param) as K;
  return keys.includes(key) ? { key, direction } : fallback;
}

/** Clicking the sorted column flips it; clicking another column sorts it ascending. */
export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}
