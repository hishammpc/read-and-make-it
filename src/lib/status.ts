// Single source of truth for status → colour tone. Pages must use these (via
// <StatusBadge> or toneClasses) instead of picking Tailwind palette colours, so the
// same status looks the same everywhere and works in dark mode.

export type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'muted' | 'primary';

/** Literal class sets per tone (kept literal so Tailwind picks them up). */
export const toneClasses: Record<StatusTone, { soft: string; solid: string; text: string; bar: string; ring: string }> = {
  success: {
    soft: 'bg-success-soft text-success-soft-foreground',
    solid: 'bg-success text-success-foreground',
    text: 'text-success',
    bar: '[&>div]:bg-success',
    ring: 'border-success ring-1 ring-success',
  },
  warning: {
    soft: 'bg-warning-soft text-warning-soft-foreground',
    solid: 'bg-warning text-warning-foreground',
    text: 'text-warning',
    bar: '[&>div]:bg-warning',
    ring: 'border-warning ring-1 ring-warning',
  },
  info: {
    soft: 'bg-info-soft text-info-soft-foreground',
    solid: 'bg-info text-info-foreground',
    text: 'text-info',
    bar: '[&>div]:bg-info',
    ring: 'border-info ring-1 ring-info',
  },
  danger: {
    soft: 'bg-destructive-soft text-destructive-soft-foreground',
    solid: 'bg-destructive text-destructive-foreground',
    text: 'text-destructive',
    bar: '[&>div]:bg-destructive',
    ring: 'border-destructive ring-1 ring-destructive',
  },
  muted: {
    soft: 'bg-muted text-muted-foreground',
    solid: 'bg-muted-foreground text-background',
    text: 'text-muted-foreground',
    bar: '[&>div]:bg-muted-foreground',
    ring: 'border-muted-foreground ring-1 ring-muted-foreground',
  },
  primary: {
    soft: 'bg-primary/10 text-primary',
    solid: 'bg-primary text-primary-foreground',
    text: 'text-primary',
    bar: '[&>div]:bg-primary',
    ring: 'border-primary ring-1 ring-primary',
  },
};

export type StatusKind = 'assignment' | 'program' | 'annualEvaluation' | 'cycle' | 'user' | 'skillChange';

const STATUS_TONES: Record<StatusKind, Record<string, StatusTone>> = {
  assignment: { Assigned: 'info', Registered: 'info', Attended: 'success', 'No-Show': 'danger' },
  program: { Planned: 'muted', Ongoing: 'info', Completed: 'success', Cancelled: 'danger' },
  annualEvaluation: { pending_staff: 'warning', pending_supervisor: 'info', completed: 'success' },
  cycle: { open: 'success', scheduled: 'info', closed: 'muted', skipped: 'warning' },
  user: { active: 'success', inactive: 'muted' },
  skillChange: { improved: 'success', unchanged: 'muted', declined: 'danger' },
};

export function getStatusTone(kind: StatusKind, status: string | null | undefined): StatusTone {
  return (status && STATUS_TONES[kind][status]) || 'muted';
}

/** Training-evaluation answer scale (official BM labels). */
export function getTrainingRatingTone(rating: string | null | undefined): StatusTone {
  switch (rating) {
    case 'BAGUS':
      return 'success';
    case 'SEDERHANA':
      return 'warning';
    case 'LEMAH':
      return 'danger';
    default:
      return 'muted';
  }
}

/**
 * Annual-evaluation 5-level scale as a diverging palette centred on neutral:
 * 1 Sangat Lemah → danger, 2 Lemah → warning, 3 Sederhana → muted,
 * 4 Bagus → info, 5 Cemerlang → success.
 */
export function getRatingLevelTone(level: number | null | undefined): StatusTone {
  switch (level) {
    case 5:
      return 'success';
    case 4:
      return 'info';
    case 3:
      return 'muted';
    case 2:
      return 'warning';
    case 1:
      return 'danger';
    default:
      return 'muted';
  }
}

/** Tone for an annual-evaluation percentage, matching getRatingLabel's bands. */
export function getRatingPercentageTone(percentage: number): StatusTone {
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'info';
  if (percentage >= 40) return 'muted';
  if (percentage >= 20) return 'warning';
  return 'danger';
}

/** Tone for progress against the 40-hour yearly training target (same bands the dashboards used). */
export function getComplianceTone(percentage: number): StatusTone {
  if (percentage >= 70) return 'success';
  if (percentage >= 40) return 'warning';
  return 'danger';
}
