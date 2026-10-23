// Program (training) evaluation forms.
//
// v1 — programs starting before 2027: five statements rated BAGUS / SEDERHANA / LEMAH,
//      plus an optional comment in `q6`. Stored as { q1: 'BAGUS', …, q6 }.
// v2 — programs starting on/after 1 Jan 2027 (MYT): four skill questions, each rated 1–5
//      before and after the program, to measure improvement (requested by MPC's Ketua
//      Pengarah). Stored as { version: 2, q1: { before, after }, …, comment }.
//
// The form is chosen by the PROGRAM's start date, so every evaluation of one program uses
// the same form and its results stay comparable. Question text and scale labels are
// official BM content and are not translated.

export const EVALUATION_V2_FROM = '2027-01-01T00:00:00+08:00';

export type EvaluationFormVersion = 1 | 2;

export function getEvaluationFormVersion(programStartDateTime: string | null | undefined): EvaluationFormVersion {
  if (!programStartDateTime) return 1;
  return new Date(programStartDateTime).getTime() >= new Date(EVALUATION_V2_FROM).getTime() ? 2 : 1;
}

export const V2_QUESTIONS = [
  { id: 'q1', short: 'Tahap Kemahiran', text: 'Tahap kemahiran saya berkaitan topik latihan ini' },
  {
    id: 'q2',
    short: 'Peningkatan Kemahiran',
    text: 'Tahap kemahiran saya berubah sebelum / selepas menghadiri latihan ini',
  },
  {
    id: 'q3',
    short: 'Aplikasi Kemahiran',
    text: 'Tahap keyakinan untuk mengaplikasi kemahiran ini berubah sebelum / selepas menghadiri sesi latihan ini',
  },
  {
    id: 'q4',
    short: 'Penyelesaian Masalah',
    text: 'Tahap keupayaan saya menyelesaikan masalah berkaitan tugas menggunakan kemahiran yang dipelajari',
  },
] as const;

export type V2QuestionId = (typeof V2_QUESTIONS)[number]['id'];

export const V2_SCALE = [
  { value: 1, label: 'Sangat rendah' },
  { value: 2, label: 'Rendah' },
  { value: 3, label: 'Sederhana' },
  { value: 4, label: 'Tinggi' },
  { value: 5, label: 'Sangat tinggi' },
] as const;

export interface BeforeAfter {
  before: number;
  after: number;
}

export type EvaluationAnswersV2 = {
  version: 2;
  comment?: string;
} & Record<V2QuestionId, BeforeAfter>;

export function isV2Answers(answers: unknown): answers is EvaluationAnswersV2 {
  return !!answers && typeof answers === 'object' && (answers as { version?: unknown }).version === 2;
}

/** Free-text comment from either form (v1 `q6`, v2 `comment`). */
export function getEvaluationComment(answers: unknown): string {
  if (!answers || typeof answers !== 'object') return '';
  const a = answers as { q6?: unknown; comment?: unknown };
  const text = isV2Answers(answers) ? a.comment : a.q6;
  return typeof text === 'string' ? text.trim() : '';
}

// Analysis (MPC, 2026-10-23): only question 2 (Peningkatan Kemahiran) is analysed. Each
// respondent counts as improved (Selepas > Sebelum), declined (Selepas < Sebelum) or
// unchanged. Shares are of the staff who answered, not of everyone assigned.
export const V2_ANALYSIS_QUESTION = V2_QUESTIONS[1];

export type SkillChange = 'improved' | 'unchanged' | 'declined';

/** Display order everywhere (diverging around "no change"). */
export const SKILL_CHANGES: readonly SkillChange[] = ['improved', 'unchanged', 'declined'];

export function getSkillChange(before: number, after: number): SkillChange {
  if (after > before) return 'improved';
  if (after < before) return 'declined';
  return 'unchanged';
}

export interface SkillChangeRespondent {
  userId: string;
  before: number;
  after: number;
  change: SkillChange;
}

export interface SkillChangeSummary {
  /** Staff who answered question 2 — the base for every percentage */
  responses: number;
  counts: Record<SkillChange, number>;
  respondents: SkillChangeRespondent[];
}

/**
 * Question-2 outcome counts for a set of v2 evaluations (one program).
 * Non-v2 answers, or a missing question-2 rating, are ignored. Null when nothing usable is left.
 */
export function summarizeSkillChange(
  evaluations: { user_id: string; answers: unknown }[]
): SkillChangeSummary | null {
  const respondents: SkillChangeRespondent[] = [];

  for (const evaluation of evaluations) {
    if (!isV2Answers(evaluation.answers)) continue;
    const rating = evaluation.answers[V2_ANALYSIS_QUESTION.id];
    if (!Number.isFinite(rating?.before) || !Number.isFinite(rating?.after)) continue;
    respondents.push({
      userId: evaluation.user_id,
      before: rating.before,
      after: rating.after,
      change: getSkillChange(rating.before, rating.after),
    });
  }

  if (respondents.length === 0) return null;
  return { responses: respondents.length, counts: countSkillChanges(respondents), respondents };
}

export function countSkillChanges(items: { change: SkillChange }[]): Record<SkillChange, number> {
  const counts: Record<SkillChange, number> = { improved: 0, unchanged: 0, declined: 0 };
  for (const item of items) counts[item.change]++;
  return counts;
}

/** Whole-number share, e.g. 24 of 30 → 80. */
export function percentOf(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/** Headline tone: green when more staff improved than declined, red for the reverse. */
export function getSkillChangeTone(counts: Record<SkillChange, number>): 'success' | 'danger' | 'muted' {
  if (counts.improved > counts.declined) return 'success';
  if (counts.declined > counts.improved) return 'danger';
  return 'muted';
}

/** "+1.3", "0.0", "−0.5" (true minus sign). */
export function formatChange(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}`;
  if (rounded < 0) return `−${Math.abs(rounded).toFixed(1)}`;
  return '0.0';
}

/** Tone for an improvement value (delta up = good). */
export function getChangeTone(value: number): 'success' | 'danger' | 'muted' {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return 'success';
  if (rounded < 0) return 'danger';
  return 'muted';
}
