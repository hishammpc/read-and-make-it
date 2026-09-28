import { ReactNode } from 'react';

export interface ChartTooltipRow {
  label: ReactNode;
  value: ReactNode;
  /** CSS colour of the series swatch, e.g. 'hsl(var(--chart-1))'. */
  color: string;
}

/**
 * Themed tooltip body for Recharts `content`. Text stays in text tokens; only the
 * swatch carries the series colour (never colour the text itself).
 */
export function ChartTooltipBox({ title, rows }: { title?: ReactNode; rows: ChartTooltipRow[] }) {
  return (
    <div className="min-w-[10rem] rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-card-hover">
      {title && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>}
      <div className="space-y-1">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: row.color }} />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
