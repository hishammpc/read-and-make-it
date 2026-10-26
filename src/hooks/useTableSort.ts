import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  formatSortParam,
  nextSort,
  parseSortParam,
  sortRows,
  type SortAccessors,
  type SortState,
} from '@/lib/sort';

/**
 * Sortable table state kept in the URL (`?sort=hours`, `?sort=-hours`), so the order
 * survives opening a row and coming back. Pass `param` when a page has two sortable tables.
 * `accessors` must be stable (define it outside the component).
 */
export function useTableSort<T, K extends string>(
  rows: readonly T[] | undefined,
  accessors: SortAccessors<T, K>,
  initial: SortState<K>,
  param = 'sort'
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { key: initialKey, direction: initialDirection } = initial;
  const raw = searchParams.get(param);

  const sort = useMemo(
    () =>
      parseSortParam(raw, Object.keys(accessors) as K[], { key: initialKey, direction: initialDirection }),
    [raw, accessors, initialKey, initialDirection]
  );

  const toggleSort = useCallback(
    (key: K) => {
      const next = nextSort(sort, key);
      const isDefault = next.key === initialKey && next.direction === initialDirection;
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (isDefault) params.delete(param);
          else params.set(param, formatSortParam(next));
          return params;
        },
        { replace: true }
      );
    },
    [sort, setSearchParams, param, initialKey, initialDirection]
  );

  const sorted = useMemo(() => sortRows(rows ?? [], accessors, sort), [rows, accessors, sort]);

  return { sorted, sort, toggleSort };
}
