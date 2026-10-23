import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ProposedTraining {
  id: string;
  user_id: string;
  year: number;
  proposal_1: string | null;
  proposal_2: string | null;
  is_entertained: boolean;
  entertained_proposal: number | null;
  proposal_1_entertained: boolean;
  proposal_2_entertained: boolean;
  entertained_at: string | null;
  entertained_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    position: string | null;
  };
}

// Get the year for which proposals are being made
export function getProposalYear(): number {
  const now = new Date();
  const month = now.getMonth();
  // In Dec: proposing for next year
  // In Jan/Feb: proposing for current year
  return month === 11 ? now.getFullYear() + 1 : now.getFullYear();
}

// Get user's proposal for a specific year
export function useMyProposedTraining(userId: string, year?: number) {
  const proposalYear = year || getProposalYear();

  return useQuery({
    queryKey: ['my-proposed-training', userId, proposalYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposed_trainings')
        .select('*')
        .eq('user_id', userId)
        .eq('year', proposalYear)
        .maybeSingle();

      if (error) throw error;
      return data as ProposedTraining | null;
    },
    enabled: !!userId,
  });
}

// Submit or update proposal
export function useSubmitProposedTraining() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      userId,
      year,
      proposal1,
      proposal2,
    }: {
      userId: string;
      year: number;
      proposal1: string;
      proposal2: string;
    }) => {
      const { data, error } = await supabase
        .from('proposed_trainings')
        .upsert(
          {
            user_id: userId,
            year,
            proposal_1: proposal1 || null,
            proposal_2: proposal2 || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,year',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-proposed-training', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['proposed-trainings-list'] });
      toast({
        title: t.common.success,
        description: t.toasts.proposalSubmitted,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.common.errorTitle,
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Admin: Get all proposals for a year
export function useProposedTrainingsList(year: number) {
  return useQuery({
    queryKey: ['proposed-trainings-list', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposed_trainings')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position)
        `)
        .eq('year', year)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Column-hinted embed (profiles:user_id) isn't inferable by supabase-js; asserted.
      return data as unknown as ProposedTraining[];
    },
  });
}

// Admin: Delete a proposal
export function useDeleteProposedTraining() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from('proposed_trainings')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposed-trainings-list'] });
      toast({
        title: t.common.success,
        description: t.toasts.proposalDeleted,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.common.errorTitle,
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Admin: Toggle entertained status for proposal 1 or 2
export function useMarkAsEntertained() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      proposalId,
      proposalNumber,
      isEntertained,
      adminId,
    }: {
      proposalId: string;
      proposalNumber: 1 | 2;
      isEntertained: boolean;
      adminId: string;
    }) => {
      const updateData: Record<string, unknown> = {
        entertained_at: new Date().toISOString(),
        entertained_by: adminId,
      };

      if (proposalNumber === 1) {
        updateData.proposal_1_entertained = isEntertained;
      } else {
        updateData.proposal_2_entertained = isEntertained;
      }

      const { data, error } = await supabase
        .from('proposed_trainings')
        .update(updateData)
        .eq('id', proposalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposed-trainings-list'] });
      toast({
        title: t.common.success,
        description: t.toasts.proposalStatusUpdated,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.common.errorTitle,
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
