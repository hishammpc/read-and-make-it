import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartTooltipBox } from '@/components/charts/ChartTooltipBox';
import { CHART_GRID_STROKE, CHART_TICK, SERIES_COLORS } from '@/components/charts/chartTheme';

export interface RadarSeries {
  dataKey: string;
  label: string;
}

interface RadarScoreChartProps {
  /** One row per axis: `{ subject, [series.dataKey]: number }`. */
  data: Array<{ subject: string } & Record<string, string | number>>;
  /** One or two series, coloured by position (slot 1 blue, slot 2 orange). */
  series: RadarSeries[];
  /** Top of the scale (5 for the annual levels, 3 for training ratings). */
  max: number;
  /** Tooltip value text, e.g. (v) => `Tahap ${v}`. */
  formatValue?: (value: number) => string;
  /** Accessible summary; the page's breakdown table is the full text equivalent. */
  ariaLabel?: string;
}

/**
 * The one spider/radar chart. Fills the parent's height — give the wrapper a height.
 * Marks follow the dataviz spec: 2px lines, light fills, 8px points with a surface ring,
 * recessive solid grid, text in text tokens, legend whenever there are two series.
 */
export function RadarScoreChart({ data, series, max, formatValue, ariaLabel }: RadarScoreChartProps) {
  const format = (value: number) => (formatValue ? formatValue(value) : String(value));

  return (
    <div className="flex h-full flex-col" role="img" aria-label={ariaLabel ?? series.map((s) => s.label).join(" · ")}>
      {series.length > 1 && (
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 pb-2 text-sm">
          {series.map((s, index) => (
            <li key={s.dataKey} className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: SERIES_COLORS[index] }} />
              <span className="text-muted-foreground">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="78%" data={data}>
            <PolarGrid stroke={CHART_GRID_STROKE} />
            <PolarAngleAxis dataKey="subject" tick={CHART_TICK} tickLine={false} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, max]}
              tickCount={max + 1}
              tick={{ ...CHART_TICK, fontSize: 10 }}
              axisLine={false}
            />
            {series.map((s, index) => (
              <Radar
                key={s.dataKey}
                name={s.label}
                dataKey={s.dataKey}
                stroke={SERIES_COLORS[index]}
                strokeWidth={2}
                fill={SERIES_COLORS[index]}
                fillOpacity={0.12}
                dot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: SERIES_COLORS[index] }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              />
            ))}
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) =>
                active && payload && payload.length > 0 ? (
                  <ChartTooltipBox
                    title={label}
                    rows={payload.map((entry) => {
                      const index = series.findIndex((s) => s.dataKey === entry.dataKey);
                      return {
                        label: entry.name,
                        value: format(Number(entry.value)),
                        color: SERIES_COLORS[Math.max(index, 0)],
                      };
                    })}
                  />
                ) : null
              }
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
