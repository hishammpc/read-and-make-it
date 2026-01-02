import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StaffWithSupervisor {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
  supervisor_id: string | null;
  supervisor?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// Get all staff with their supervisors
export function useStaffWithSupervisors() {
  return useQuery({
    queryKey: ['staff-with-supervisors'],
    queryFn: async () => {
      // First get all staff
      const { data: staff, error } = await supabase
        .from('profiles')
        .select('id, name, email, department, position, supervisor_id')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      // Get supervisor names
      const supervisorIds = staff
        .filter((s) => s.supervisor_id)
        .map((s) => s.supervisor_id);

      let supervisorMap: Record<string, { id: string; name: string; email: string }> = {};

      if (supervisorIds.length > 0) {
        const { data: supervisors, error: supError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', supervisorIds);

        if (supError) throw supError;

        supervisorMap = (supervisors || []).reduce((acc, sup) => {
          acc[sup.id] = sup;
          return acc;
        }, {} as Record<string, { id: string; name: string; email: string }>);
      }

      return staff.map((s) => ({
        ...s,
        supervisor: s.supervisor_id ? supervisorMap[s.supervisor_id] || null : null,
      })) as StaffWithSupervisor[];
    },
  });
}

// Get potential supervisors (all staff except the current user)
export function usePotentialSupervisors(excludeUserId?: string) {
  return useQuery({
    queryKey: ['potential-supervisors', excludeUserId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, name, email, department, position')
        .eq('status', 'active')
        .order('name');

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

// Update supervisor for a staff member
export function useUpdateSupervisor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      supervisorId,
    }: {
      userId: string;
      supervisorId: string | null;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ supervisor_id: supervisorId })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-with-supervisors'] });
      queryClient.invalidateQueries({ queryKey: ['staff-without-supervisors'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Berjaya',
        description: 'Penyelia telah dikemaskini',
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

// Get staff under a supervisor
export function useStaffBySupervisor(supervisorId: string) {
  return useQuery({
    queryKey: ['staff-by-supervisor', supervisorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, department, position')
        .eq('supervisor_id', supervisorId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!supervisorId,
  });
}

// Get supervisor for a user
export function useUserSupervisor(userId: string) {
  return useQuery({
    queryKey: ['user-supervisor', userId],
    queryFn: async () => {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('supervisor_id')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      if (!user.supervisor_id) return null;

      const { data: supervisor, error: supError } = await supabase
        .from('profiles')
        .select('id, name, email, department, position')
        .eq('id', user.supervisor_id)
        .single();

      if (supError) throw supError;
      return supervisor;
    },
    enabled: !!userId,
  });
}
