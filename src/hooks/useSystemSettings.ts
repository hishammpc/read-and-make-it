import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();

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
        title: t.common.success,
        description: t.toasts.settingsUpdated,
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

/** Admin override for the proposal window: follow the dates, or force it open/closed. */
export type ProposalWindowMode = 'auto' | 'open' | 'closed';

// A type alias (not an interface) so the stored JSON can be cast to it
export type ProposalPeriodValue = {
  start_date: string;
  end_date: string;
  /** Missing on rows saved before the override existed → 'auto'. */
  mode?: ProposalWindowMode;
};

/** Today's date as YYYY-MM-DD in local time (MYT for our users). */
export function localTodayStr(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Open/closed state of a proposal period on a given day. Pure, so the admin page can
 * preview unsaved dates with exactly the rules staff will get once they're saved.
 */
export function getProposalWindowState(period: ProposalPeriodValue | null, todayStr: string) {
  const startDate = period?.start_date || null;
  const endDate = period?.end_date || null;
  const mode: ProposalWindowMode = period?.mode ?? 'auto';

  const withinDates = startDate && endDate ? todayStr >= startDate && todayStr <= endDate : false;
  // The admin's manual override wins over the dates
  const isOpen = mode === 'open' ? true : mode === 'closed' ? false : withinDates;
  const isPastEnd = !!endDate && todayStr > endDate;
  // New proposals count for the end date's year
  const proposalYear = endDate ? parseInt(endDate.substring(0, 4)) : parseInt(todayStr.substring(0, 4));

  return { startDate, endDate, mode, withinDates, isOpen, isPastEnd, proposalYear };
}

// Convenience hook for the proposal period setting
export function useProposalPeriod() {
  const { data, isLoading } = useSystemSetting('proposal_period');
  const value = data?.value as ProposalPeriodValue | null;

  return {
    ...getProposalWindowState(value, localTodayStr()),
    isLoading,
  };
}
