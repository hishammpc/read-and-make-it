import { useLocation } from 'react-router-dom';

interface ReturnState {
  from?: unknown;
}

/**
 * Router state for a link from a list to a detail page: `<Link to=… state={returnState}>`.
 * The detail page's back link and post-save redirect then return to this exact URL,
 * filters and sort included.
 */
export function useReturnState(): { from: string } {
  const location = useLocation();
  return { from: location.pathname + location.search };
}

/** Where "back" goes: the page the user came from (with its filters), else `fallback`. */
export function useReturnTo(fallback: string): string {
  const location = useLocation();
  const from = (location.state as ReturnState | null)?.from;
  // Only in-app paths; never an absolute URL from tampered history state
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : fallback;
}
