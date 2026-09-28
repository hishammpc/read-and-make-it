import { ReactNode } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ToneBadge } from '@/components/common/StatusBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRatingLevelTone } from '@/lib/status';
import { cn } from '@/lib/utils';

export interface RatingLevel {
  tahap: number;
  description: string;
  marks?: number;
}

interface LevelRadioGroupProps {
  /** Unique prefix for option ids (e.g. the question id, plus a form suffix). */
  idPrefix: string;
  levels: RatingLevel[];
  value: number | undefined;
  onChange: (level: number) => void;
  /** id of the element holding the question text. */
  labelledBy: string;
  /** Extra text next to the level badge (e.g. marks on the supervisor form). */
  renderMeta?: (level: RatingLevel) => ReactNode;
}

/** The annual-evaluation 1–5 level picker: one selectable card per level. */
export function LevelRadioGroup({ idPrefix, levels, value, onChange, labelledBy, renderMeta }: LevelRadioGroupProps) {
  const { t } = useLanguage();

  return (
    <RadioGroup
      value={value?.toString()}
      onValueChange={(next) => onChange(parseInt(next))}
      aria-labelledby={labelledBy}
      className="space-y-3"
    >
      {levels.map((level) => {
        const optionId = `${idPrefix}-${level.tahap}`;
        const isSelected = value === level.tahap;
        return (
          <div
            key={level.tahap}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-4 transition-colors',
              isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent'
            )}
          >
            <RadioGroupItem value={level.tahap.toString()} id={optionId} className="mt-0.5" />
            <Label htmlFor={optionId} className="flex-1 cursor-pointer font-normal leading-normal">
              <span className="mb-1 flex flex-wrap items-center gap-2">
                <ToneBadge tone={getRatingLevelTone(level.tahap)}>{t.employee.annual.level(level.tahap)}</ToneBadge>
                {renderMeta && <span className="text-sm text-muted-foreground">{renderMeta(level)}</span>}
              </span>
              {/* Level descriptions are official BM content */}
              <span className="block text-sm text-muted-foreground">{level.description}</span>
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
