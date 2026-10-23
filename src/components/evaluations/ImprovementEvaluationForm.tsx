import { useState } from 'react';
import { ArrowDown, ArrowRight, Check, CheckCircle2, Loader2, MessageSquare, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ToneBadge } from '@/components/common/StatusBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  V2_QUESTIONS,
  V2_SCALE,
  formatChange,
  getChangeTone,
  type EvaluationAnswersV2,
  type V2QuestionId,
} from '@/lib/evaluationForms';

type Side = 'before' | 'after';
type Draft = Record<V2QuestionId, { before?: number; after?: number }>;

// Official BM headings of the form (not translated, like the question text)
const SIDE_LABELS: Record<Side, string> = { before: 'Sebelum program', after: 'Selepas program' };
const TOTAL_RATINGS = V2_QUESTIONS.length * 2;

interface LevelScaleProps {
  side: Side;
  value: number | undefined;
  onChange: (value: number) => void;
  labelledBy: string;
}

/**
 * 1–5 scale that fills up to the chosen level, like a meter. "Before" uses a light tint
 * and "after" solid primary — the same light/solid pairing as the admin charts.
 */
function LevelScale({ side, value, onChange, labelledBy }: LevelScaleProps) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="grid grid-cols-5 gap-1 rounded-xl border bg-muted/40 p-1"
      >
        {V2_SCALE.map((option) => {
          const selected = value === option.value;
          const filled = value !== undefined && option.value <= value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${option.value} — ${option.label}`}
              title={option.label}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-10 rounded-lg text-sm font-semibold tabular-nums transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                !filled && 'text-muted-foreground hover:bg-background hover:text-foreground',
                // Levels below the choice are tinted so the bar "fills"; the choice itself is strongest
                side === 'before' && filled && !selected && 'bg-primary/10 text-primary',
                side === 'before' && selected && 'bg-primary/25 text-primary shadow-sm',
                side === 'after' && filled && !selected && 'bg-primary/20 text-primary',
                side === 'after' && selected && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              {option.value}
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex justify-between px-1 text-[11px] text-muted-foreground">
        <span>{V2_SCALE[0].label}</span>
        <span>{V2_SCALE[V2_SCALE.length - 1].label}</span>
      </div>
    </div>
  );
}

interface ImprovementEvaluationFormProps {
  onSubmit: (answers: EvaluationAnswersV2) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
}

/** Evaluation form v2 (programs from 2027): each question rated 1–5 before and after the program. */
export function ImprovementEvaluationForm({ onSubmit, onCancel, submitting = false }: ImprovementEvaluationFormProps) {
  const { t } = useLanguage();
  const tf = t.employee.evaluationForm;

  const [draft, setDraft] = useState<Draft>(
    () => Object.fromEntries(V2_QUESTIONS.map((q) => [q.id, {}])) as Draft
  );
  const [comment, setComment] = useState('');

  const setRating = (id: V2QuestionId, side: Side, value: number) =>
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [side]: value } }));

  const filled = V2_QUESTIONS.reduce(
    (n, q) => n + (draft[q.id].before ? 1 : 0) + (draft[q.id].after ? 1 : 0),
    0
  );
  const complete = filled === TOTAL_RATINGS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete || submitting) return;
    const answers = { version: 2 } as EvaluationAnswersV2;
    for (const q of V2_QUESTIONS) {
      answers[q.id] = { before: draft[q.id].before!, after: draft[q.id].after! };
    }
    if (comment.trim()) answers.comment = comment.trim();
    void onSubmit(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Scale (official BM) */}
      <dl className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        <dt className="mr-1 font-medium text-muted-foreground">{tf.scaleTitle}</dt>
        {V2_SCALE.map((s) => (
          <dd key={s.value} className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {s.value}
            </span>
            <span className="text-muted-foreground">{s.label}</span>
          </dd>
        ))}
      </dl>

      {V2_QUESTIONS.map((question, index) => {
        const value = draft[question.id];
        const answered = !!value.before && !!value.after;
        const change = answered ? value.after! - value.before! : null;
        const changeTone = change === null ? 'muted' : getChangeTone(change);
        const ChangeIcon = changeTone === 'success' ? TrendingUp : changeTone === 'danger' ? TrendingDown : Minus;

        return (
          <Card key={question.id} className={cn('transition-colors', answered && 'border-success/40')}>
            <CardContent className="space-y-5 p-5 sm:p-6">
              {/* Question */}
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                    answered ? 'bg-success-soft text-success-soft-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {answered ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{question.short}</h3>
                  <p id={`${question.id}-label`} className="mt-0.5 text-sm text-muted-foreground">
                    {question.text}
                  </p>
                </div>
                {change !== null && (
                  <ToneBadge tone={changeTone} className="shrink-0 gap-1.5 px-2.5 py-1">
                    <ChangeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tf.changeLabel} {formatChange(change)}
                  </ToneBadge>
                )}
              </div>

              {/* Before → after */}
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start md:gap-4">
                {(['before', 'after'] as const).map((side, i) => {
                  const labelId = `${question.id}-${side}-label`;
                  const chosen = value[side];
                  return (
                    <div key={side} className={cn('space-y-2', i === 1 && 'md:col-start-3')}>
                      <p id={labelId} className="text-sm">
                        <span className="font-medium">{SIDE_LABELS[side]}</span>
                        {chosen && <span className="text-muted-foreground"> · {V2_SCALE[chosen - 1].label}</span>}
                      </p>
                      <LevelScale
                        side={side}
                        value={chosen}
                        onChange={(v) => setRating(question.id, side, v)}
                        labelledBy={`${question.id}-label ${labelId}`}
                      />
                    </div>
                  );
                })}
                <div
                  aria-hidden="true"
                  className="row-start-2 flex justify-center text-muted-foreground md:col-start-2 md:row-start-1 md:mt-9"
                >
                  <ArrowDown className="h-4 w-4 md:hidden" />
                  <ArrowRight className="hidden h-5 w-5 md:block" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Optional comment (official BM label, same as the previous form) */}
      <Card>
        <CardContent className="space-y-3 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <Label htmlFor="evaluation-comment" className="font-semibold">
                Lain-lain komen atau cadangan
              </Label>
              <p className="mt-0.5 text-sm text-muted-foreground">{tf.optional}</p>
            </div>
          </div>
          <Textarea
            id="evaluation-comment"
            placeholder={tf.commentsPlaceholder}
            className="min-h-[100px] resize-none"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
          />
        </CardContent>
      </Card>

      {/* Sticky progress + actions */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-xl sm:border sm:shadow-card-hover">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={cn('truncate', complete ? 'font-medium text-success' : 'text-muted-foreground')}>
                {complete ? tf.allRated : tf.remainingRatings(TOTAL_RATINGS - filled)}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {filled}/{TOTAL_RATINGS}
              </span>
            </div>
            <Progress
              value={(filled / TOTAL_RATINGS) * 100}
              aria-label={tf.readyTitle}
              className={cn('mt-1.5 h-1.5', complete && '[&>div]:bg-success')}
            />
          </div>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="hidden sm:inline-flex">
              {t.common.cancel}
            </Button>
          )}
          <Button type="submit" disabled={!complete || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {tf.submit}
          </Button>
        </div>
      </div>
    </form>
  );
}
