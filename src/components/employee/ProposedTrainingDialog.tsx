import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  getProposalYear,
} from '@/hooks/useProposedTrainings';

interface ProposedTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProposedTrainingDialog({
  open,
  onOpenChange,
}: ProposedTrainingDialogProps) {
  const { user } = useAuth();
  const proposalYear = getProposalYear();
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
          <DialogTitle>Propose Training for {proposalYear}</DialogTitle>
          <DialogDescription>
            Submit your training proposals for the upcoming year. You can suggest up to 2 trainings.
          </DialogDescription>
        </DialogHeader>

        {existingProposal && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              You have already submitted a proposal. You can update it below.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="proposal1">Training Proposal 1</Label>
            <Input
              id="proposal1"
              placeholder="e.g., Advanced Excel Training"
              value={proposal1}
              onChange={(e) => setProposal1(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal2">Training Proposal 2 (Optional)</Label>
            <Input
              id="proposal2"
              placeholder="e.g., Leadership Skills Workshop"
              value={proposal2}
              onChange={(e) => setProposal2(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasContent || submitProposal.isPending || isLoading}
          >
            {submitProposal.isPending ? (
              'Submitting...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {existingProposal ? 'Update Proposal' : 'Submit Proposal'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
