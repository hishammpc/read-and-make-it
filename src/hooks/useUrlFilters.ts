import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * List filters kept in the URL (`?year=2025&target=below`), so they survive opening a
 * row and coming back, and a filtered list can be shared as a link. A value equal to its
 * default is left out of the URL. `defaults` must be stable (define it outside the component).
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const values: Record<string, string> = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const value = searchParams.get(key);
      if (value !== null) values[key] = value;
    }
    return values as T;
  }, [searchParams, defaults]);

  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === defaults[key]) params.delete(key);
            else params.set(key, value);
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaults]
  );

  /** Back to defaults for the given keys (all filters when omitted); sort order is kept. */
  const clearFilters = useCallback(
    (keys: Array<keyof T> = Object.keys(defaults)) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          keys.forEach((key) => params.delete(String(key)));
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaults]
  );

  return { filters, setFilters, clearFilters };
}
