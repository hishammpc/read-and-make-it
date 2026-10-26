import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getYearBounds, isWithinBounds } from '@/lib/dateUtils';
import { TRAINING_TARGET_HOURS, targetPercentage } from '@/lib/trainingTarget';

export interface DashboardStats {
  totalPrograms: number;
  totalParticipants: number;
  totalHours: number;
  compliancePercentage: number;
  upcomingPrograms: any[];
  overdueEvaluations: any[];
  hoursByDepartment: Record<string, number>;
}

export async function fetchEmployeeDashboardStats(userId: string, selectedYear: number) {
  const yearBounds = getYearBounds(selectedYear);

  // Get user's assignments with program details
  const { data: assignments, error: assignmentsError } = await supabase
    .from('program_assignments')
    .select(`
      *,
      programs!inner(*)
    `)
    .eq('user_id', userId);

  if (assignmentsError) throw assignmentsError;

  // Calculate hours this year (all assigned programs count)
  const hoursThisYear = assignments
    ?.filter((a: any) =>
      isWithinBounds(a.programs?.start_date_time, yearBounds)
    )
    .reduce((sum: number, a: any) => sum + (a.programs?.hours || 0), 0) || 0;

  // Get next upcoming program
  const today = new Date().toISOString();
  const nextProgram = assignments
    ?.filter((a: any) =>
      ['Assigned', 'Registered'].includes(a.status) &&
      a.programs?.start_date_time >= today
    )
    .sort((a: any, b: any) =>
      new Date(a.programs?.start_date_time).getTime() -
      new Date(b.programs?.start_date_time).getTime()
    )[0];

  // Get pending evaluations (only programs that require evaluation AND match selected year)
  const pendingEvaluations = [];
  const programsRequiringEvaluation = (assignments || []).filter(
    (a: any) =>
      a.programs?.notify_for_evaluation === true &&
      isWithinBounds(a.programs?.start_date_time, yearBounds)
  );

  if (programsRequiringEvaluation.length > 0) {
    // One query for all of them (was one per program)
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('evaluations')
      .select('program_id')
      .eq('user_id', userId);
    if (evaluationsError) throw evaluationsError;

    const evaluated = new Set((evaluations || []).map((e) => e.program_id));
    pendingEvaluations.push(
      ...programsRequiringEvaluation.filter((a) => !evaluated.has(a.program_id))
    );
  }

  // Calculate hours by category
  const hoursByCategory: Record<string, number> = {
    Technical: 0,
    Leadership: 0,
    'Soft Skill': 0,
    Mandatory: 0,
    Others: 0,
  };

  assignments
    ?.filter((a: any) =>
      isWithinBounds(a.programs?.start_date_time, yearBounds)
    )
    .forEach((a: any) => {
      const category = a.programs?.category || 'Others';
      const hours = a.programs?.hours || 0;
      if (hoursByCategory[category] !== undefined) {
        hoursByCategory[category] += hours;
      } else {
        hoursByCategory.Others += hours;
      }
    });

  // Filter training history by selected year
  const trainingHistoryFiltered = (assignments || []).filter((a: any) =>
    isWithinBounds(a.programs?.start_date_time, yearBounds)
  );

  return {
    hoursThisYear,
    targetHours: TRAINING_TARGET_HOURS,
    compliancePercentage: targetPercentage(hoursThisYear),
    nextProgram: nextProgram ? (nextProgram as any).programs : null,
    pendingEvaluationsCount: pendingEvaluations.length,
    pendingEvaluations,
    hoursByCategory,
    trainingHistory: trainingHistoryFiltered,
  };
}

export function useEmployeeDashboardStats(userId: string, year?: number) {
  const selectedYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['employee-dashboard-stats', userId, selectedYear],
    placeholderData: keepPreviousData,
    queryFn: () => fetchEmployeeDashboardStats(userId, selectedYear),
    enabled: !!userId,
  });
}
