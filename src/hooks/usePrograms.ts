import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Program {
  id: string;
  title: string;
  description: string | null;
  category: string;
  start_date_time: string;
  end_date_time: string;
  location: string | null;
  organizer: string | null;
  trainer: string | null;
  hours: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramInput {
  title: string;
  description?: string;
  category: string;
  start_date_time: string;
  end_date_time: string;
  location?: string;
  organizer?: string;
  trainer?: string;
  hours: number;
  status?: string;
}

export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('start_date_time', { ascending: false });

      if (error) throw error;
      return data as Program[];
    },
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: ['programs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Program;
    },
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (program: CreateProgramInput) => {
      const { data, error } = await supabase
        .from('programs')
        .insert(program)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({
        title: 'Success',
        description: 'Program created successfully',
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

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateProgramInput> }) => {
      const { data, error } = await supabase
        .from('programs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs', variables.id] });
      toast({
        title: 'Success',
        description: 'Program updated successfully',
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

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({
        title: 'Success',
        description: 'Program deleted successfully',
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

// Get programs with participant counts
export function useProgramsWithStats() {
  return useQuery({
    queryKey: ['programs-with-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          *,
          program_assignments(count)
        `)
        .order('start_date_time', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
