import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { getYearBounds } from '@/lib/dateUtils';
import { hasAdminRole } from '@/lib/trainingTarget';

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
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      userId,
      supervisorId,
    }: {
      userId: string;
      supervisorId: string | null;
    }) => {
      // Update profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update({ supervisor_id: supervisorId })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Also update any pending annual evaluations for this user
      // (only update evaluations that haven't been completed yet)
      if (supervisorId) {
        const { error: evalError } = await supabase
          .from('annual_evaluations')
          .update({ supervisor_id: supervisorId })
          .eq('user_id', userId)
          .in('status', ['pending_staff', 'pending_supervisor']);

        if (evalError) {
          // Surface it: otherwise the open evaluation stays with the old supervisor
          // while the admin sees "success". Re-running the change is safe.
          throw new Error(
            `Penyelia dikemaskini dalam profil, tetapi gagal dikemaskini dalam penilaian tahunan: ${evalError.message}. Sila cuba lagi.`
          );
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-with-supervisors'] });
      queryClient.invalidateQueries({ queryKey: ['staff-without-supervisors'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['annual-evaluation-cycle'] });
      queryClient.invalidateQueries({ queryKey: ['supervisee-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-annual-evaluations'] });
      toast({
        title: t.common.success,
        description: t.toasts.supervisorUpdated,
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

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  position: string | null;
  is_admin: boolean;
  training_hours: number;
}

/**
 * A supervisor's active direct reports with their training hours for a year (programs
 * counted in the year they start — the same rule as the admin Users list).
 */
export async function fetchTeamTrainingHours(supervisorId: string, year: number): Promise<TeamMember[]> {
  const team = await fetchAllRows((from, to) =>
    supabase
      .from('profiles')
      .select('id, name, email, position, user_roles(role)')
      .eq('supervisor_id', supervisorId)
      .eq('status', 'active')
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );
  if (team.length === 0) return [];

  const { start, end } = getYearBounds(year);
  // Ids go in the URL: 100 at a time keeps it short for a large team
  const ids = team.map((member) => member.id);
  const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, i * 100 + 100));
  const assignments = (
    await Promise.all(
      batches.map((batch) =>
        fetchAllRows((from, to) =>
          supabase
            .from('program_assignments')
            .select('id, user_id, programs!inner(hours, start_date_time)')
            .in('user_id', batch)
            .gte('programs.start_date_time', start)
            .lt('programs.start_date_time', end)
            .order('id', { ascending: true })
            .range(from, to)
        )
      )
    )
  ).flat();

  const hours: Record<string, number> = {};
  assignments.forEach((assignment) => {
    hours[assignment.user_id] = (hours[assignment.user_id] || 0) + (assignment.programs?.hours || 0);
  });

  return team.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    position: member.position,
    is_admin: hasAdminRole(member.user_roles),
    training_hours: hours[member.id] || 0,
  }));
}

export function useTeamTrainingHours(supervisorId: string, year: number) {
  return useQuery({
    queryKey: ['team-training-hours', supervisorId, year],
    queryFn: () => fetchTeamTrainingHours(supervisorId, year),
    enabled: !!supervisorId,
  });
}

/** Whether anyone active reports to this person (shows "Pasukan saya" in the staff menu). */
export function useHasTeam(supervisorId: string) {
  return useQuery({
    queryKey: ['has-team', supervisorId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('supervisor_id', supervisorId)
        .eq('status', 'active');
      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!supervisorId,
  });
}
