import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnnualEvaluationCycle {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'closed';
  created_at: string;
  created_by: string | null;
}

export interface AnnualEvaluation {
  id: string;
  cycle_id: string;
  user_id: string;
  supervisor_id: string | null;
  staff_answers: Record<string, number> | null;
  supervisor_answers: Record<string, number> | null;
  staff_submitted_at: string | null;
  supervisor_submitted_at: string | null;
  status: 'pending_staff' | 'pending_supervisor' | 'completed';
  created_at: string;
  profiles?: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    position: string | null;
  };
  supervisor?: {
    id: string;
    name: string;
    email: string;
  };
}

// Get all evaluation cycles
export function useAnnualEvaluationCycles() {
  return useQuery({
    queryKey: ['annual-evaluation-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_evaluation_cycles')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;
      return data as AnnualEvaluationCycle[];
    },
  });
}

// Get single cycle with all evaluations
export function useAnnualEvaluationCycle(cycleId: string) {
  return useQuery({
    queryKey: ['annual-evaluation-cycle', cycleId],
    queryFn: async () => {
      // Get cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('annual_evaluation_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      if (cycleError) throw cycleError;

      // Get evaluations for this cycle
      const { data: evaluations, error: evalError } = await supabase
        .from('annual_evaluations')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position),
          supervisor:supervisor_id(id, name, email)
        `)
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: true });

      if (evalError) throw evalError;

      return {
        cycle: cycle as AnnualEvaluationCycle,
        evaluations: evaluations as AnnualEvaluation[],
      };
    },
    enabled: !!cycleId,
  });
}

// Get staff without supervisors
export function useStaffWithoutSupervisors() {
  return useQuery({
    queryKey: ['staff-without-supervisors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, department')
        .is('supervisor_id', null)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
  });
}

// Create new evaluation cycle
export function useCreateAnnualEvaluationCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ year, createdBy }: { year: number; createdBy: string }) => {
      // Check if all staff have supervisors
      const { data: staffWithoutSupervisor, error: checkError } = await supabase
        .from('profiles')
        .select('id, name')
        .is('supervisor_id', null)
        .eq('status', 'active');

      if (checkError) throw checkError;

      if (staffWithoutSupervisor && staffWithoutSupervisor.length > 0) {
        throw new Error(`${staffWithoutSupervisor.length} staff belum ada penyelia. Sila tetapkan penyelia untuk semua kakitangan terlebih dahulu.`);
      }

      // Create the cycle
      const startDate = `${year}-12-01`;
      const endDate = `${year + 1}-02-28`;

      const { data: cycle, error: cycleError } = await supabase
        .from('annual_evaluation_cycles')
        .insert({
          year,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          created_by: createdBy,
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // Get all active staff with their supervisors
      const { data: allStaff, error: staffError } = await supabase
        .from('profiles')
        .select('id, supervisor_id')
        .eq('status', 'active');

      if (staffError) throw staffError;

      // Create evaluation records for all staff
      const evaluations = allStaff.map((staff) => ({
        cycle_id: cycle.id,
        user_id: staff.id,
        supervisor_id: staff.supervisor_id,
        status: 'pending_staff',
      }));

      const { error: evalError } = await supabase
        .from('annual_evaluations')
        .insert(evaluations);

      if (evalError) throw evalError;

      return cycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annual-evaluation-cycles'] });
      toast({
        title: 'Berjaya',
        description: 'Penilaian tahunan telah dihantar kepada semua kakitangan',
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

// Get all annual evaluations for a user (all years)
export function useMyAllAnnualEvaluations(userId: string) {
  return useQuery({
    queryKey: ['my-all-annual-evaluations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .select(`
          *,
          cycle:cycle_id(id, year, start_date, end_date, status),
          supervisor:supervisor_id(id, name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Get user's annual evaluation for a cycle
export function useMyAnnualEvaluation(userId: string, cycleId?: string) {
  return useQuery({
    queryKey: ['my-annual-evaluation', userId, cycleId],
    queryFn: async () => {
      let query = supabase
        .from('annual_evaluations')
        .select(`
          *,
          cycle:cycle_id(id, year, start_date, end_date, status),
          supervisor:supervisor_id(id, name, email)
        `)
        .eq('user_id', userId);

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      } else {
        // Get the most recent active cycle
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return cycleId ? data?.[0] : data?.[0];
    },
    enabled: !!userId,
  });
}

// Get all pending evaluations for a user (active cycles)
export function useMyPendingAnnualEvaluations(userId: string) {
  return useQuery({
    queryKey: ['my-pending-annual-evaluations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .select(`
          *,
          cycle:cycle_id(id, year, start_date, end_date, status)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending_staff');

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Submit staff self-evaluation
export function useSubmitStaffEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      evaluationId,
      answers,
    }: {
      evaluationId: string;
      answers: Record<string, number>;
    }) => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .update({
          staff_answers: answers,
          staff_submitted_at: new Date().toISOString(),
          status: 'pending_supervisor',
        })
        .eq('id', evaluationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-annual-evaluation'] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-annual-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['annual-evaluation-cycle'] });
      toast({
        title: 'Berjaya',
        description: 'Penilaian kendiri telah dihantar',
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

// Get supervisees' evaluations for a supervisor
export function useSuperviseeEvaluations(supervisorId: string, cycleId?: string) {
  return useQuery({
    queryKey: ['supervisee-evaluations', supervisorId, cycleId],
    queryFn: async () => {
      let query = supabase
        .from('annual_evaluations')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position),
          cycle:cycle_id(id, year, start_date, end_date, status)
        `)
        .eq('supervisor_id', supervisorId)
        .in('status', ['pending_supervisor', 'completed']);

      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!supervisorId,
  });
}

// Get pending supervisee evaluations count
export function usePendingSuperviseeCount(supervisorId: string) {
  return useQuery({
    queryKey: ['pending-supervisee-count', supervisorId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('annual_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', supervisorId)
        .eq('status', 'pending_supervisor');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!supervisorId,
  });
}

// Submit supervisor evaluation
export function useSubmitSupervisorEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      evaluationId,
      answers,
    }: {
      evaluationId: string;
      answers: Record<string, number>;
    }) => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .update({
          supervisor_answers: answers,
          supervisor_submitted_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', evaluationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisee-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-supervisee-count'] });
      queryClient.invalidateQueries({ queryKey: ['annual-evaluation-cycle'] });
      toast({
        title: 'Berjaya',
        description: 'Penilaian penyelia telah dihantar',
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

// Get single evaluation with full details (for result view)
export function useAnnualEvaluationResult(evaluationId: string) {
  return useQuery({
    queryKey: ['annual-evaluation-result', evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_evaluations')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position),
          supervisor:supervisor_id(id, name, email),
          cycle:cycle_id(id, year, start_date, end_date, status)
        `)
        .eq('id', evaluationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!evaluationId,
  });
}

// Close an evaluation cycle
export function useCloseEvaluationCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cycleId: string) => {
      const { data, error } = await supabase
        .from('annual_evaluation_cycles')
        .update({ status: 'closed' })
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annual-evaluation-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['annual-evaluation-cycle'] });
      toast({
        title: 'Berjaya',
        description: 'Kitaran penilaian telah ditutup',
      });
    },
  });
}
