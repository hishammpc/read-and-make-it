import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EvaluationTemplate {
  id: string;
  program_id: string | null;
  title: string;
  questions: any;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  user_id: string;
  program_id: string;
  template_id: string | null;
  answers: any;
  submitted_at: string;
}

export interface CreateEvaluationTemplateInput {
  program_id?: string;
  title: string;
  questions: any[];
}

export interface SubmitEvaluationInput {
  program_id: string;
  template_id?: string;
  answers: any;
}

export function useEvaluationTemplates() {
  return useQuery({
    queryKey: ['evaluation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select(`
          *,
          programs:program_id(id, title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useEvaluationTemplate(id: string) {
  return useQuery({
    queryKey: ['evaluation-templates', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as EvaluationTemplate;
    },
    enabled: !!id,
  });
}

export function useProgramEvaluationTemplate(programId: string) {
  return useQuery({
    queryKey: ['evaluation-templates', 'program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('program_id', programId)
        .maybeSingle();

      if (error) throw error;
      return data as EvaluationTemplate | null;
    },
    enabled: !!programId,
  });
}

export function useCreateEvaluationTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: CreateEvaluationTemplateInput) => {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
      toast({
        title: 'Success',
        description: 'Evaluation template created successfully',
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

export function useUpdateEvaluationTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateEvaluationTemplateInput>;
    }) => {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates', variables.id] });
      toast({
        title: 'Success',
        description: 'Evaluation template updated successfully',
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

export function useDeleteEvaluationTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evaluation_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
      toast({
        title: 'Success',
        description: 'Evaluation template deleted successfully',
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

// Evaluation submissions
export function useEvaluations() {
  return useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          profiles:user_id(id, name, email),
          programs:program_id(id, title)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useUserEvaluations(userId: string) {
  return useQuery({
    queryKey: ['evaluations', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          programs:program_id(id, title, start_date_time, end_date_time)
        `)
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useSubmitEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, evaluation }: { userId: string; evaluation: SubmitEvaluationInput }) => {
      const { data, error } = await supabase
        .from('evaluations')
        .insert({
          user_id: userId,
          ...evaluation,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast({
        title: 'Success',
        description: 'Evaluation submitted successfully',
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
