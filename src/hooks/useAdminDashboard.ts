import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DepartmentCompliance {
  department: string;
  employeeCount: number;
  totalHours: number;
  targetHours: number;
  compliancePercentage: number;
}

export interface MonthlyTrend {
  month: string;
  monthNum: number;
  hours: number;
  programs: number;
}

export interface EvaluationSummary {
  q1: number; // Average scores for each question
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  totalResponses: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  department: string;
  hoursCompleted: number;
  compliancePercentage: number;
}

export interface EnhancedDashboardStats {
  // Basic KPIs
  totalPrograms: number;
  totalParticipants: number;
  totalHours: number;
  compliancePercentage: number;

  // Existing
  upcomingPrograms: any[];
  overdueEvaluations: any[];
  hoursByDepartment: Record<string, number>;

  // New metrics
  departmentCompliance: DepartmentCompliance[];
  monthlyTrend: MonthlyTrend[];
  evaluationSummary: EvaluationSummary | null;
  leaderboard: LeaderboardEntry[];

  // Meta
  selectedYear: number;
  availableYears: number[];
}

export function useEnhancedAdminDashboard(year?: number) {
  const selectedYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['enhanced-admin-dashboard', selectedYear],
    queryFn: async (): Promise<EnhancedDashboardStats> => {
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, department');

      if (profilesError) throw profilesError;

      // Get all programs this year
      const { data: programs, error: programsError } = await supabase
        .from('programs')
        .select('id, title, hours, start_date_time, end_date_time, category')
        .gte('start_date_time', startOfYear)
        .lte('start_date_time', endOfYear);

      if (programsError) throw programsError;

      // Get all assignments with program data
      const { data: assignments, error: assignmentsError } = await supabase
        .from('program_assignments')
        .select(`
          user_id,
          program_id,
          status,
          programs!inner(hours, end_date_time, start_date_time)
        `)
        .gte('programs.end_date_time', startOfYear)
        .lte('programs.end_date_time', endOfYear);

      if (assignmentsError) throw assignmentsError;

      // Get all evaluations for this year
      const { data: evaluations, error: evaluationsError } = await supabase
        .from('evaluations')
        .select('*')
        .gte('submitted_at', startOfYear)
        .lte('submitted_at', endOfYear);

      if (evaluationsError) throw evaluationsError;

      // === Calculate Basic KPIs ===
      const uniqueParticipants = new Set((assignments || []).map((a: any) => a.user_id)).size;
      const totalHours = (assignments || []).reduce(
        (sum: number, a: any) => sum + (a.programs?.hours || 0), 0
      );
      const targetHours = uniqueParticipants * 40;
      const compliancePercentage = targetHours > 0
        ? Math.min(Math.round((totalHours / targetHours) * 100), 100)
        : 0;

      // === Hours by Department ===
      const hoursByDept: Record<string, number> = {};
      const employeesByDept: Record<string, Set<string>> = {};

      (assignments || []).forEach((assignment: any) => {
        const profile = (profiles || []).find((p: any) => p.id === assignment.user_id);
        const dept = profile?.department || 'Unknown';
        const hours = assignment.programs?.hours || 0;

        hoursByDept[dept] = (hoursByDept[dept] || 0) + hours;

        if (!employeesByDept[dept]) employeesByDept[dept] = new Set();
        employeesByDept[dept].add(assignment.user_id);
      });

      // === Department Compliance ===
      const departmentCompliance: DepartmentCompliance[] = Object.keys(hoursByDept).map(dept => {
        const employeeCount = employeesByDept[dept]?.size || 0;
        const totalDeptHours = hoursByDept[dept] || 0;
        const deptTargetHours = employeeCount * 40;
        return {
          department: dept,
          employeeCount,
          totalHours: totalDeptHours,
          targetHours: deptTargetHours,
          compliancePercentage: deptTargetHours > 0
            ? Math.min(Math.round((totalDeptHours / deptTargetHours) * 100), 100)
            : 0,
        };
      }).sort((a, b) => b.compliancePercentage - a.compliancePercentage);

      // === Monthly Trend ===
      const monthlyData: Record<number, { hours: number; programs: Set<string> }> = {};
      for (let m = 1; m <= 12; m++) {
        monthlyData[m] = { hours: 0, programs: new Set() };
      }

      (assignments || []).forEach((assignment: any) => {
        const endDate = new Date(assignment.programs?.end_date_time);
        const month = endDate.getMonth() + 1;
        monthlyData[month].hours += assignment.programs?.hours || 0;
        monthlyData[month].programs.add(assignment.program_id);
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTrend: MonthlyTrend[] = Object.entries(monthlyData).map(([monthNum, data]) => ({
        month: monthNames[parseInt(monthNum) - 1],
        monthNum: parseInt(monthNum),
        hours: data.hours,
        programs: data.programs.size,
      }));

      // === Evaluation Summary ===
      let evaluationSummary: EvaluationSummary | null = null;
      if (evaluations && evaluations.length > 0) {
        const scoreMap: Record<string, number> = { 'LEMAH': 1, 'SEDERHANA': 2, 'BAGUS': 3 };
        const totals: Record<string, number> = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 };
        const counts: Record<string, number> = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 };

        evaluations.forEach((e: any) => {
          const answers = e.answers || {};
          for (let i = 1; i <= 9; i++) {
            const key = `q${i}`;
            const value = answers[key];
            if (value && scoreMap[value]) {
              totals[key] += scoreMap[value];
              counts[key]++;
            }
          }
        });

        evaluationSummary = {
          q1: counts.q1 > 0 ? Math.round((totals.q1 / counts.q1) * 100) / 100 : 0,
          q2: counts.q2 > 0 ? Math.round((totals.q2 / counts.q2) * 100) / 100 : 0,
          q3: counts.q3 > 0 ? Math.round((totals.q3 / counts.q3) * 100) / 100 : 0,
          q4: counts.q4 > 0 ? Math.round((totals.q4 / counts.q4) * 100) / 100 : 0,
          q5: counts.q5 > 0 ? Math.round((totals.q5 / counts.q5) * 100) / 100 : 0,
          q6: counts.q6 > 0 ? Math.round((totals.q6 / counts.q6) * 100) / 100 : 0,
          q7: counts.q7 > 0 ? Math.round((totals.q7 / counts.q7) * 100) / 100 : 0,
          q8: counts.q8 > 0 ? Math.round((totals.q8 / counts.q8) * 100) / 100 : 0,
          q9: counts.q9 > 0 ? Math.round((totals.q9 / counts.q9) * 100) / 100 : 0,
          totalResponses: evaluations.length,
        };
      }

      // === Leaderboard ===
      const userHours: Record<string, number> = {};
      (assignments || []).forEach((assignment: any) => {
        const userId = assignment.user_id;
        userHours[userId] = (userHours[userId] || 0) + (assignment.programs?.hours || 0);
      });

      const leaderboard: LeaderboardEntry[] = (profiles || [])
        .map((profile: any) => ({
          userId: profile.id,
          name: profile.name || 'Unknown',
          department: profile.department || '-',
          hoursCompleted: userHours[profile.id] || 0,
          compliancePercentage: Math.min(Math.round(((userHours[profile.id] || 0) / 40) * 100), 100),
          rank: 0,
        }))
        .sort((a, b) => b.hoursCompleted - a.hoursCompleted)
        .slice(0, 10)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      // === Upcoming Programs ===
      const today = new Date().toISOString();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: upcomingPrograms } = await supabase
        .from('programs')
        .select('*')
        .gte('start_date_time', today)
        .lte('start_date_time', nextWeek)
        .order('start_date_time', { ascending: true })
        .limit(5);

      // === Overdue Evaluations ===
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: overdueAssignments } = await supabase
        .from('program_assignments')
        .select(`
          id, user_id, program_id,
          programs!inner(id, title, end_date_time),
          profiles!inner(id, name, email)
        `)
        .eq('status', 'Attended')
        .lt('programs.end_date_time', threeDaysAgo)
        .limit(10);

      const overdueList = [];
      for (const assignment of overdueAssignments || []) {
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

      // === Available Years ===
      const { data: allPrograms } = await supabase
        .from('programs')
        .select('start_date_time');

      const yearsSet = new Set<number>();
      yearsSet.add(new Date().getFullYear());
      (allPrograms || []).forEach((p: any) => {
        if (p.start_date_time) {
          yearsSet.add(new Date(p.start_date_time).getFullYear());
        }
      });
      const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

      return {
        totalPrograms: programs?.length || 0,
        totalParticipants: uniqueParticipants,
        totalHours,
        compliancePercentage,
        upcomingPrograms: upcomingPrograms || [],
        overdueEvaluations: overdueList,
        hoursByDepartment: hoursByDept,
        departmentCompliance,
        monthlyTrend,
        evaluationSummary,
        leaderboard,
        selectedYear,
        availableYears,
      };
    },
  });
}
