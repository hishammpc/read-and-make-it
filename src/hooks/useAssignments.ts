import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProgramAssignment {
  id: string;
  user_id: string;
  program_id: string;
  status: string;
  attendance_marked_by: string | null;
  attendance_marked_at: string | null;
  certificate_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithDetails extends ProgramAssignment {
  profiles: {
    id: string;
    name: string;
    email: string;
    department: string | null;
  };
  programs: {
    id: string;
    title: string;
    category: string;
    start_date_time: string;
    end_date_time: string;
    hours: number;
  };
}

export function useProgramAssignments(programId: string) {
  return useQuery({
    queryKey: ['program-assignments', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_assignments')
        .select(`
          *,
          profiles:user_id(id, name, email, department, position)
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });
}

export function useUserAssignments(userId: string) {
  return useQuery({
    queryKey: ['user-assignments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_assignments')
        .select(`
          *,
          programs:program_id(id, title, category, start_date_time, end_date_time, hours, status)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AssignmentWithDetails[];
    },
    enabled: !!userId,
  });
}

export function useAssignUsersToProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ programId, userIds }: { programId: string; userIds: string[] }) => {
      const assignments = userIds.map((userId) => ({
        program_id: programId,
        user_id: userId,
        status: 'Assigned',
      }));

      const { data, error } = await supabase
        .from('program_assignments')
        .insert(assignments)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['program-assignments', variables.programId] });
      queryClient.invalidateQueries({ queryKey: ['programs-with-stats'] });
      toast({
        title: 'Success',
        description: 'Users assigned to program successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      status,
      markedBy
    }: {
      assignmentId: string;
      status: string;
      markedBy?: string;
    }) => {
      const updates: any = { status };

      if (status === 'Attended' || status === 'No-Show') {
        updates.attendance_marked_by = markedBy;
        updates.attendance_marked_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('program_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      toast({
        title: 'Success',
        description: 'Assignment status updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('program_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['programs-with-stats'] });
      toast({
        title: 'Success',
        description: 'Assignment removed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
