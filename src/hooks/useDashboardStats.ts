import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalPrograms: number;
  totalParticipants: number;
  totalHours: number;
  compliancePercentage: number;
  upcomingPrograms: any[];
  overdueEvaluations: any[];
  hoursByDepartment: Record<string, number>;
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      // Get total programs this year
      const { data: programs, error: programsError } = await supabase
        .from('programs')
        .select('id')
        .gte('start_date_time', startOfYear)
        .lte('start_date_time', endOfYear);

      if (programsError) throw programsError;

      // Get unique participants
      const { data: participants, error: participantsError } = await supabase
        .from('program_assignments')
        .select('user_id', { count: 'exact', head: false });

      if (participantsError) throw participantsError;

      const uniqueParticipants = new Set(participants?.map((p) => p.user_id) || []).size;

      // Get total training hours (attended programs)
      const { data: attendedPrograms, error: hoursError } = await supabase
        .from('program_assignments')
        .select(`
          programs!inner(hours, end_date_time)
        `)
        .eq('status', 'Attended')
        .gte('programs.end_date_time', startOfYear)
        .lte('programs.end_date_time', endOfYear);

      if (hoursError) throw hoursError;

      const totalHours = attendedPrograms?.reduce(
        (sum, assignment: any) => sum + (assignment.programs?.hours || 0),
        0
      ) || 0;

      // Calculate compliance percentage (assuming 40 hours target per employee)
      const targetHours = uniqueParticipants * 40;
      const compliancePercentage = targetHours > 0
        ? Math.min(Math.round((totalHours / targetHours) * 100), 100)
        : 0;

      // Get upcoming programs (next 7 days)
      const today = new Date().toISOString();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: upcomingPrograms, error: upcomingError } = await supabase
        .from('programs')
        .select('*')
        .gte('start_date_time', today)
        .lte('start_date_time', nextWeek)
        .order('start_date_time', { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      // Get overdue evaluations (programs completed >3 days ago without evaluation)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const { data: overdueEvaluations, error: overdueError } = await supabase
        .from('program_assignments')
        .select(`
          id,
          user_id,
          program_id,
          programs!inner(id, title, end_date_time),
          profiles!inner(id, name, email)
        `)
        .eq('status', 'Attended')
        .lt('programs.end_date_time', threeDaysAgo)
        .limit(10);

      if (overdueError) throw overdueError;

      // Filter out those with evaluations
      const overdueList = [];
      for (const assignment of overdueEvaluations || []) {
        const { data: evaluation } = await supabase
          .from('evaluations')
          .select('id')
          .eq('user_id', (assignment as any).user_id)
          .eq('program_id', (assignment as any).program_id)
          .maybeSingle();

        if (!evaluation) {
          overdueList.push(assignment);
        }
      }

      // Get hours by department
      const { data: departmentData, error: deptError } = await supabase
        .from('program_assignments')
        .select(`
          profiles!inner(department),
          programs!inner(hours, end_date_time)
        `)
        .eq('status', 'Attended')
        .gte('programs.end_date_time', startOfYear)
        .lte('programs.end_date_time', endOfYear);

      if (deptError) throw deptError;

      const hoursByDepartment: Record<string, number> = {};
      departmentData?.forEach((item: any) => {
        const dept = item.profiles?.department || 'Unknown';
        const hours = item.programs?.hours || 0;
        hoursByDepartment[dept] = (hoursByDepartment[dept] || 0) + hours;
      });

      return {
        totalPrograms: programs?.length || 0,
        totalParticipants: uniqueParticipants,
        totalHours,
        compliancePercentage,
        upcomingPrograms: upcomingPrograms || [],
        overdueEvaluations: overdueList,
        hoursByDepartment,
      } as DashboardStats;
    },
  });
}

export function useEmployeeDashboardStats(userId: string, year?: number) {
  const selectedYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['employee-dashboard-stats', userId, selectedYear],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;

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
          a.programs?.end_date_time >= startOfYear &&
          a.programs?.end_date_time <= endOfYear
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

      // Get pending evaluations (only programs that require evaluation)
      const pendingEvaluations = [];
      const programsRequiringEvaluation = (assignments || []).filter(
        (a: any) => a.programs?.notify_for_evaluation === true
      );

      for (const assignment of programsRequiringEvaluation) {
        const { data: evaluation } = await supabase
          .from('evaluations')
          .select('id')
          .eq('user_id', userId)
          .eq('program_id', (assignment as any).program_id)
          .maybeSingle();

        if (!evaluation) {
          pendingEvaluations.push(assignment);
        }
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
          a.programs?.end_date_time >= startOfYear &&
          a.programs?.end_date_time <= endOfYear
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
        a.programs?.end_date_time >= startOfYear &&
        a.programs?.end_date_time <= endOfYear
      );

      return {
        hoursThisYear,
        targetHours: 40,
        compliancePercentage: Math.min(Math.round((hoursThisYear / 40) * 100), 100),
        nextProgram: nextProgram ? (nextProgram as any).programs : null,
        pendingEvaluationsCount: pendingEvaluations.length,
        pendingEvaluations,
        hoursByCategory,
        trainingHistory: trainingHistoryFiltered,
      };
    },
    enabled: !!userId,
  });
}
