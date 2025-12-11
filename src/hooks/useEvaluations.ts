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

        // Calculate average rating from all q1-q5 answers
        const allScores: number[] = [];
        programEvals.forEach(e => {
          const answers = e.answers as any;
          ['q1', 'q2', 'q3', 'q4', 'q5'].forEach(q => {
            const rating = answers?.[q];
            if (rating === 'BAGUS') allScores.push(3);
            else if (rating === 'SEDERHANA') allScores.push(2);
            else if (rating === 'LEMAH') allScores.push(1);
          });
        });

        const avgScore = allScores.length > 0
          ? allScores.reduce((a, b) => a + b, 0) / allScores.length
          : 0;

        // Determine average rating label
        let avgRating = '-';
        if (avgScore >= 2.5) avgRating = 'BAGUS';
        else if (avgScore >= 1.5) avgRating = 'SEDERHANA';
        else if (avgScore > 0) avgRating = 'LEMAH';

        // Collect all q6 comments
        const comments = programEvals
          .map(e => (e.answers as any)?.q6)
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

// Get evaluation summary for a specific program with question-level breakdown
export interface ProgramEvaluationDetails {
  totalAssigned: number;
  totalResponses: number;
  averageRating: string;
  averageScore: number;
  questionScores: {
    question: string;
    shortLabel: string;
    avgScore: number;
    bagusCount: number;
    sederhanaCount: number;
    lemahCount: number;
  }[];
  comments: string[];
}

const QUESTION_LABELS = [
  { id: 'q1', text: 'Program ini mencapai objektif', short: 'Objektif' },
  { id: 'q2', text: 'Tenaga pengajar yang berpengalaman', short: 'Pengajar' },
  { id: 'q3', text: 'Bahan (Material) yang digunakan adalah maklumat terkini', short: 'Bahan' },
  { id: 'q4', text: 'Program ini bermanfaat', short: 'Bermanfaat' },
  { id: 'q5', text: 'Program ini wajar diteruskan di masa akan datang', short: 'Diteruskan' },
];

export function useProgramEvaluationDetails(programId: string) {
  return useQuery({
    queryKey: ['program-evaluation-details', programId],
    queryFn: async () => {
      // Get total assigned
      const { data: assignments, error: assignError } = await supabase
        .from('program_assignments')
        .select('id')
        .eq('program_id', programId);

      if (assignError) throw assignError;

      // Get all evaluations for this program
      const { data: evaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('program_id', programId);

      if (evalError) throw evalError;

      const totalAssigned = assignments?.length || 0;
      const totalResponses = evaluations?.length || 0;

      // Calculate per-question scores
      const questionScores = QUESTION_LABELS.map(q => {
        let bagusCount = 0;
        let sederhanaCount = 0;
        let lemahCount = 0;

        evaluations?.forEach(e => {
          const answer = (e.answers as any)?.[q.id];
          if (answer === 'BAGUS') bagusCount++;
          else if (answer === 'SEDERHANA') sederhanaCount++;
          else if (answer === 'LEMAH') lemahCount++;
        });

        const total = bagusCount + sederhanaCount + lemahCount;
        const avgScore = total > 0
          ? (bagusCount * 3 + sederhanaCount * 2 + lemahCount * 1) / total
          : 0;

        return {
          question: q.text,
          shortLabel: q.short,
          avgScore,
          bagusCount,
          sederhanaCount,
          lemahCount,
        };
      });

      // Calculate overall average
      const allScores = questionScores.filter(q => q.avgScore > 0).map(q => q.avgScore);
      const avgScore = allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0;

      let avgRating = '-';
      if (avgScore >= 2.5) avgRating = 'BAGUS';
      else if (avgScore >= 1.5) avgRating = 'SEDERHANA';
      else if (avgScore > 0) avgRating = 'LEMAH';

      // Collect comments
      const comments = evaluations
        ?.map(e => (e.answers as any)?.q6)
        .filter(c => c && c.trim() !== '') || [];

      return {
        totalAssigned,
        totalResponses,
        averageRating: avgRating,
        averageScore: avgScore,
        questionScores,
        comments,
      } as ProgramEvaluationDetails;
    },
    enabled: !!programId,
  });
}
