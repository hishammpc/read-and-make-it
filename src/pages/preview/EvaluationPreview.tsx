import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { Notice } from '@/components/common/Callout';
import { ImprovementEvaluationForm } from '@/components/evaluations/ImprovementEvaluationForm';

/**
 * No-login preview of the program evaluation form used from 2027 (before/after
 * improvement form), for MPC to review. Nothing is saved.
 */
export default function EvaluationPreview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const tf = t.employee.evaluationForm;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              {t.common.back}
            </Button>
            <span aria-hidden="true" className="h-6 w-px bg-border" />
            <h1 className="text-base font-semibold sm:text-lg">{tf.title}</h1>
          </div>
          <LanguageSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Notice tone="info" icon={Eye}>
          Pratonton borang penilaian program bagi program bermula 1 Januari 2027. Tiada data disimpan.
        </Notice>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contoh program</p>
          <h2 className="mt-1 text-xl font-semibold">Bengkel Pengurusan Projek 2027</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tf.v2Description}</p>
        </div>

        <ImprovementEvaluationForm
          onCancel={() => navigate('/dashboard')}
          onSubmit={() => {
            toast({
              title: 'Pratonton sahaja',
              description: 'Borang ini tidak menyimpan sebarang data.',
            });
          }}
        />
      </main>
    </div>
  );
}
