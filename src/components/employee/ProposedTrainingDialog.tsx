import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Send } from 'lucide-react';
import {
  useMyProposedTraining,
  useSubmitProposedTraining,
} from '@/hooks/useProposedTrainings';
import { useProposalPeriod } from '@/hooks/useSystemSettings';

interface ProposedTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {' '}*
    </span>
  );
}

/** One training proposal per year: the training, what it covers / why, and optional notes. */
export default function ProposedTrainingDialog({
  open,
  onOpenChange,
}: ProposedTrainingDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tp = t.dashboard.proposal;
  const { proposalYear } = useProposalPeriod();
  const { data: existingProposal, isLoading } = useMyProposedTraining(
    user?.userId || '',
    proposalYear
  );
  const submitProposal = useSubmitProposedTraining();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Load existing proposal data when dialog opens
  useEffect(() => {
    setTitle(existingProposal?.training_title || '');
    setDetails(existingProposal?.training_details || '');
    setNotes(existingProposal?.notes || '');
  }, [existingProposal, open]);

  const canSubmit = !!title.trim() && !!details.trim();

  const handleSubmit = async () => {
    if (!user?.userId || !canSubmit) return;

    await submitProposal.mutateAsync({
      userId: user.userId,
      year: proposalYear,
      title: title.trim(),
      details: details.trim(),
      notes: notes.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{tp.title(proposalYear)}</DialogTitle>
          <DialogDescription>{tp.description}</DialogDescription>
        </DialogHeader>

        {existingProposal?.training_title && (
          <Alert className="border-success/30 bg-success-soft text-success-soft-foreground [&>svg]:text-success-soft-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{tp.alreadySubmitted}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="proposal-title">
              {tp.titleLabel}
              <RequiredMark />
            </Label>
            <Input
              id="proposal-title"
              placeholder={tp.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal-details">
              {tp.detailsLabel}
              <RequiredMark />
            </Label>
            <Textarea
              id="proposal-details"
              placeholder={tp.detailsPlaceholder}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              disabled={isLoading}
              rows={4}
              maxLength={2000}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal-notes">{tp.notesLabel}</Label>
            <Textarea
              id="proposal-notes"
              placeholder={tp.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitProposal.isPending || isLoading}>
            <Send className="h-4 w-4" />
            {submitProposal.isPending ? t.common.submitting : t.common.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
