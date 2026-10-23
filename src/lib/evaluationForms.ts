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

export interface RespondentImprovement {
  userId: string;
  /** after − before for each question */
  changes: Record<V2QuestionId, number>;
  ratings: Record<V2QuestionId, BeforeAfter>;
  /** Mean of this person's four changes */
  avgChange: number;
}

export interface ImprovementSummary {
  responses: number;
  questions: { id: V2QuestionId; short: string; avgBefore: number; avgAfter: number; avgChange: number }[];
  avgBefore: number;
  avgAfter: number;
  avgChange: number;
  /** Share (0–1) of respondents whose own average change is above zero */
  improvedShare: number;
  respondents: RespondentImprovement[];
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/**
 * Improvement for a set of v2 evaluations (one program, or several pooled).
 * Non-v2 or incomplete answers are ignored. Returns null when nothing usable is left.
 */
export function summarizeImprovement(
  evaluations: { user_id: string; answers: unknown }[]
): ImprovementSummary | null {
  const respondents: RespondentImprovement[] = [];

  for (const evaluation of evaluations) {
    const answers = evaluation.answers;
    if (!isV2Answers(answers)) continue;
    const complete = V2_QUESTIONS.every(
      (q) => Number.isFinite(answers[q.id]?.before) && Number.isFinite(answers[q.id]?.after)
    );
    if (!complete) continue;

    const changes = {} as Record<V2QuestionId, number>;
    const ratings = {} as Record<V2QuestionId, BeforeAfter>;
    for (const q of V2_QUESTIONS) {
      ratings[q.id] = { before: answers[q.id].before, after: answers[q.id].after };
      changes[q.id] = answers[q.id].after - answers[q.id].before;
    }
    respondents.push({
      userId: evaluation.user_id,
      changes,
      ratings,
      avgChange: mean(V2_QUESTIONS.map((q) => changes[q.id])),
    });
  }

  if (respondents.length === 0) return null;

  const questions = V2_QUESTIONS.map((q) => {
    const avgBefore = mean(respondents.map((r) => r.ratings[q.id].before));
    const avgAfter = mean(respondents.map((r) => r.ratings[q.id].after));
    return { id: q.id, short: q.short, avgBefore, avgAfter, avgChange: avgAfter - avgBefore };
  });

  const avgBefore = mean(questions.map((q) => q.avgBefore));
  const avgAfter = mean(questions.map((q) => q.avgAfter));

  return {
    responses: respondents.length,
    questions,
    avgBefore,
    avgAfter,
    avgChange: avgAfter - avgBefore,
    improvedShare: respondents.filter((r) => r.avgChange > 0).length / respondents.length,
    respondents,
  };
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
