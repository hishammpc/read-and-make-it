// Chart colours and chrome, all from theme tokens (see --chart-* in index.css).

/** Colour for the n-th categorical series (fixed order, never cycled). */
export const SERIES_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'] as const;

/** Recessive, theme-aware axis ticks and grid. */
export const CHART_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
export const CHART_GRID_STROKE = 'hsl(var(--chart-grid))';

/** Diverging outcome colours (always shown with their labels): improved / no change / declined. */
export const OUTCOME_COLORS = {
  improved: 'hsl(var(--success))',
  unchanged: 'hsl(var(--chart-neutral))',
  declined: 'hsl(var(--destructive))',
} as const;
