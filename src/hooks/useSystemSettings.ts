import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Fetch a single system setting by key
export function useSystemSetting(key: string) {
  return useQuery({
    queryKey: ['system-settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// Upsert a system setting
export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value, updatedBy }: { key: string; value: unknown; updatedBy?: string }) => {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key,
            value: value as any,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || null,
          },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', variables.key] });
      toast({
        title: 'Berjaya',
        description: 'Tetapan telah dikemaskini',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ralat',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Convenience hook for the proposal period setting
export function useProposalPeriod() {
  const { data, isLoading } = useSystemSetting('proposal_period');

  const value = data?.value as { start_date: string; end_date: string } | null;
  const startDate = value?.start_date || null;
  const endDate = value?.end_date || null;

  // Determine if the proposal period is currently open
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const isOpen = startDate && endDate ? todayStr >= startDate && todayStr <= endDate : false;

  // Determine the proposal year based on the end date
  const proposalYear = endDate ? parseInt(endDate.substring(0, 4)) : now.getFullYear();

  return {
    startDate,
    endDate,
    isOpen,
    proposalYear,
    isLoading,
  };
}
