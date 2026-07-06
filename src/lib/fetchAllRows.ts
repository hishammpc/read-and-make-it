// Supabase/PostgREST returns at most 1000 rows per request by default. Any query
// that aggregates across all users/programs (dashboards, leaderboard, reports)
// silently truncates past row 1000, producing undercounted hours/participants and
// dropping the most recent months. This helper pages through the full result set.
//
// Usage: pass a factory that builds a FRESH query for the given inclusive [from, to]
// window. `.range()` must be the last call in the chain.
//
//   const rows = await fetchAllRows((from, to) =>
//     supabase.from('program_assignments').select('...').gte(...).range(from, to)
//   );

const PAGE_SIZE = 1000;
const MAX_PAGES = 200; // Runaway guard: up to 200k rows.

export async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;

    const batch = data || [];
    rows.push(...batch);

    // A short page means we've reached the end.
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}
