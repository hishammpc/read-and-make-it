// The yearly training-hours target and who it applies to. One place, so the Users list,
// reports, dashboards and leaderboards count the same people the same way.
//
// Year rule (Hazman, 2026-10-26): a program's hours count in the year it STARTS.

export const TRAINING_TARGET_HOURS = 40;

/** met = reached 40 h; below = under 40 h (includes none); none = no hours at all */
export type TargetBand = 'met' | 'below' | 'none';

/** Share of the target reached, 0–100. */
export function targetPercentage(hours: number): number {
  return Math.min(Math.round((hours / TRAINING_TARGET_HOURS) * 100), 100);
}

/** Hours still needed to reach the target (0 once reached). */
export function hoursRemaining(hours: number): number {
  return Math.max(TRAINING_TARGET_HOURS - hours, 0);
}

export function isTargetMet(hours: number): boolean {
  return hours >= TRAINING_TARGET_HOURS;
}

export function matchesTargetBand(hours: number, band: TargetBand): boolean {
  if (band === 'met') return isTargetMet(hours);
  if (band === 'none') return hours <= 0;
  return !isTargetMet(hours);
}

/**
 * Only active staff without the admin role count toward the target
 * (Hazman, 2026-10-26). Admin accounts and leavers are left out of compliance
 * figures and leaderboards.
 */
export function countsTowardTarget(profile: { status?: string | null; is_admin?: boolean }): boolean {
  return profile.status === 'active' && !profile.is_admin;
}

/** Whether a `user_roles(role)` embed includes admin. PostgREST returns an object or an array. */
export function hasAdminRole(roleRows: unknown): boolean {
  const rows = (Array.isArray(roleRows) ? roleRows : [roleRows]) as Array<{ role?: string } | null>;
  return rows.some((row) => row?.role === 'admin');
}
