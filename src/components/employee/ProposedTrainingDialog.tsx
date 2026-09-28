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

  const [proposal1, setProposal1] = useState('');
  const [proposal2, setProposal2] = useState('');

  // Load existing proposal data when dialog opens
  useEffect(() => {
    if (existingProposal) {
      setProposal1(existingProposal.proposal_1 || '');
      setProposal2(existingProposal.proposal_2 || '');
    } else {
      setProposal1('');
      setProposal2('');
    }
  }, [existingProposal, open]);

  const handleSubmit = async () => {
    if (!user?.userId) return;
    if (!proposal1.trim() && !proposal2.trim()) return;

    await submitProposal.mutateAsync({
      userId: user.userId,
      year: proposalYear,
      proposal1: proposal1.trim(),
      proposal2: proposal2.trim(),
    });

    onOpenChange(false);
  };

  const hasContent = proposal1.trim() || proposal2.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tp.title(proposalYear)}</DialogTitle>
          <DialogDescription>{tp.description}</DialogDescription>
        </DialogHeader>

        {existingProposal && (
          <Alert className="border-success/30 bg-success-soft text-success-soft-foreground [&>svg]:text-success-soft-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{tp.alreadySubmitted}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="proposal1">{tp.proposal1}</Label>
            <Input
              id="proposal1"
              placeholder={tp.placeholder1}
              value={proposal1}
              onChange={(e) => setProposal1(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal2">{tp.proposal2}</Label>
            <Input
              id="proposal2"
              placeholder={tp.placeholder2}
              value={proposal2}
              onChange={(e) => setProposal2(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasContent || submitProposal.isPending || isLoading}
          >
            <Send className="h-4 w-4" />
            {submitProposal.isPending ? t.common.submitting : t.common.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
