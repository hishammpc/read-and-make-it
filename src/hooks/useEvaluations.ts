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

// Get evaluations grouped by program with aggregated stats
export interface ProgramEvaluationSummary {
  programId: string;
  programTitle: string;
  totalAssigned: number;
  totalResponses: number;
  averageRating: string;
  averageScore: number;
  comments: string[];
  startDate: string;
  endDate: string;
}

export function useEvaluationsByProgram(year?: number, fromMonth?: string, toMonth?: string) {
  return useQuery({
    queryKey: ['evaluations-by-program', year, fromMonth, toMonth],
    queryFn: async () => {
      const currentYear = year || new Date().getFullYear();
      const startMonth = (fromMonth && fromMonth !== 'all') ? parseInt(fromMonth) : 1;
      const endMonth = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;

      const startDate = `${currentYear}-${String(startMonth).padStart(2, '0')}-01T00:00:00`;
      const lastDay = new Date(currentYear, endMonth, 0).getDate();
      const endDate = `${currentYear}-${String(endMonth).padStart(2, '0')}-${lastDay}T23:59:59`;

      // Fetch programs within date range
      const { data: programs, error: programsError } = await supabase
        .from('programs')
        .select(`
          id,
          title,
          start_date_time,
          end_date_time,
          program_assignments(count)
        `)
        .gte('start_date_time', startDate)
        .lte('start_date_time', endDate)
        .order('start_date_time', { ascending: false });

      if (programsError) throw programsError;

      // Fetch all evaluations for these programs
      const programIds = programs?.map(p => p.id) || [];

      if (programIds.length === 0) {
        return [];
      }

      const { data: evaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .in('program_id', programIds);

      if (evalError) throw evalError;

      // Group evaluations by program and calculate stats
      const result: ProgramEvaluationSummary[] = programs?.map(program => {
        const programEvals = evaluations?.filter(e => e.program_id === program.id) || [];
        const totalAssigned = (program.program_assignments as any)?.[0]?.count || 0;

        // Calculate average rating from q9 answers
        const ratings = programEvals
          .map(e => (e.answers as any)?.q9)
          .filter(Boolean);

        // Convert ratings to scores: BAGUS=3, SEDERHANA=2, LEMAH=1
        const scores = ratings.map(r => {
          if (r === 'BAGUS') return 3;
          if (r === 'SEDERHANA') return 2;
          if (r === 'LEMAH') return 1;
          return 0;
        });

        const avgScore = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

        // Determine average rating label
        let avgRating = '-';
        if (avgScore >= 2.5) avgRating = 'BAGUS';
        else if (avgScore >= 1.5) avgRating = 'SEDERHANA';
        else if (avgScore > 0) avgRating = 'LEMAH';

        // Collect all q10 comments
        const comments = programEvals
          .map(e => (e.answers as any)?.q10)
          .filter(c => c && c.trim() !== '');

        return {
          programId: program.id,
          programTitle: program.title,
          totalAssigned,
          totalResponses: programEvals.length,
          averageRating: avgRating,
          averageScore: avgScore,
          comments,
          startDate: program.start_date_time,
          endDate: program.end_date_time,
        };
      }) || [];

      return result;
    },
  });
}
