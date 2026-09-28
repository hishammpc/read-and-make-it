import { cn } from '@/lib/utils';
import { getComplianceTone, toneClasses, type StatusTone } from '@/lib/status';

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  /** Colour override; defaults to the compliance bands (<40 danger, <70 warning, else success). */
  tone?: StatusTone;
  /** Accessible name, e.g. "Pematuhan 85%". */
  label?: string;
}

/** Progress ring on theme tokens, so it works in light and dark mode. */
export function CircularProgress({
  value,
  size = 36,
  strokeWidth = 3,
  className,
  showValue = false,
  tone,
  label,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(value, 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clamped / 100) * circumference;
  const toneText = toneClasses[tone ?? getComplianceTone(value)].text;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-500 ease-out', toneText)}
        />
      </svg>
      {showValue && (
        <span className={cn('absolute text-[10px] font-semibold tabular-nums', toneText)}>
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
