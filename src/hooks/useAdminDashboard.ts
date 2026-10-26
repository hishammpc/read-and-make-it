import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { parseDateSafe, getYearBounds } from '@/lib/dateUtils';
import { countsTowardTarget, hasAdminRole, isTargetMet, targetPercentage } from '@/lib/trainingTarget';

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
  totalParticipants: number; // Total participations across all programs (seats filled)
  uniqueUsers: number;       // Distinct employees who attended >= 1 program
  totalHours: number;
  compliancePercentage: number;

  // Existing
  upcomingPrograms: any[];
  overdueEvaluations: any[];
  hoursByDepartment: Record<string, number>;

  // New metrics
  departmentCompliance: DepartmentCompliance[];
  monthlyTrend: MonthlyTrend[];
  leaderboard: LeaderboardEntry[];
  /** Active non-admin staff, and how many of them are under 40 h this year */
  targetStaffCount: number;
  belowTargetCount: number;

  // Meta
  selectedYear: number;
  availableYears: number[];
}

/**
 * Attended seats on evaluation-required programs of the given year (by start date)
 * that ended more than 3 days ago, with no evaluation submitted (oldest first, max 10).
 */
async function fetchOverdueEvaluations(startOfYear: string, endOfYear: string) {
  // Filter in JS after fetching both sides — limiting before the "no evaluation"
  // filter hid real overdue rows. `profiles:user_id` must be explicit:
  // program_assignments has two FKs to profiles (user_id, attendance_marked_by),
  // and an unhinted embed makes PostgREST reject the whole query.
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const [attendedAssignments, yearEvaluations] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('program_assignments')
        .select(`
          id, user_id, program_id,
          programs!inner(id, title, end_date_time, notify_for_evaluation),
          profiles:user_id(id, name, email)
        `)
        .eq('status', 'Attended')
        .eq('programs.notify_for_evaluation', true)
        .gte('programs.start_date_time', startOfYear)
        .lt('programs.start_date_time', endOfYear)
        .lt('programs.end_date_time', threeDaysAgo)
        .order('id')
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('evaluations')
        .select('id, user_id, program_id, programs!inner(start_date_time)')
        .gte('programs.start_date_time', startOfYear)
        .lt('programs.start_date_time', endOfYear)
        .order('id')
        .range(from, to)
    ),
  ]);

  const evaluatedSeats = new Set(
    yearEvaluations.map((e: any) => `${e.user_id}:${e.program_id}`)
  );
  return attendedAssignments
    .filter((a: any) => !evaluatedSeats.has(`${a.user_id}:${a.program_id}`))
    .sort((a: any, b: any) =>
      new Date(a.programs.end_date_time).getTime() - new Date(b.programs.end_date_time).getTime()
    )
    .slice(0, 10);
}

export async function fetchAdminDashboard(selectedYear: number): Promise<EnhancedDashboardStats> {
  const { start: startOfYear, end: endOfYear } = getYearBounds(selectedYear);

  // Get all profiles (paginated to bypass the 1000-row cap)
  const profiles = await fetchAllRows((from, to) =>
    supabase
      .from('profiles')
      .select('id, name, department, status, user_roles(role)')
      .order('id')
      .range(from, to)
  );

  // Get all programs this year (paginated)
  const programs = await fetchAllRows((from, to) =>
    supabase
      .from('programs')
      .select('id, title, hours, start_date_time, end_date_time, category')
      .gte('start_date_time', startOfYear)
      .lt('start_date_time', endOfYear)
      .order('id')
      .range(from, to)
  );

  // Get all assignments with program data (paginated — this is the set that
  // feeds hours, participants, monthly trend, department compliance & leaderboard)
  const assignments = await fetchAllRows((from, to) =>
    supabase
      .from('program_assignments')
      .select(`
        id,
        user_id,
        program_id,
        status,
        programs!inner(hours, end_date_time, start_date_time)
      `)
      .gte('programs.start_date_time', startOfYear)
      .lt('programs.start_date_time', endOfYear)
      .order('id')
      .range(from, to)
  );


  // === Calculate Basic KPIs ===
  // Total participations = one count per (user x program) seat filled.
  const totalParticipations = (assignments || []).length;
  // Unique users = distinct employees (bounded by headcount); used for the
  // compliance target below and shown as the card subtitle.
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
    // Bucket by START date so a program that spans a month boundary
    // (e.g. starts 31 Mar, ends 1 Apr) counts in the month it was held —
    // matching admin expectation and useUsersWithTrainingHours. Use the
    // timezone-safe parser so the month isn't shifted by the browser's TZ.
    const rawStart = assignment.programs?.start_date_time;
    if (!rawStart) return;
    const month = parseDateSafe(rawStart).getMonth() + 1;
    if (Number.isNaN(month) || month < 1 || month > 12) return;
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

  // === Leaderboard ===
  const userHours: Record<string, number> = {};
  (assignments || []).forEach((assignment: any) => {
    const userId = assignment.user_id;
    userHours[userId] = (userHours[userId] || 0) + (assignment.programs?.hours || 0);
  });

  // Only staff the 40-hour target applies to (active, not admin)
  const targetStaff = (profiles || []).filter((profile) =>
    countsTowardTarget({ status: profile.status, is_admin: hasAdminRole(profile.user_roles) })
  );
  const belowTargetCount = targetStaff.filter(
    (profile) => !isTargetMet(userHours[profile.id] || 0)
  ).length;

  const leaderboard: LeaderboardEntry[] = targetStaff
    .map((profile: any) => ({
      userId: profile.id,
      name: profile.name || 'Unknown',
      department: profile.department || '-',
      hoursCompleted: userHours[profile.id] || 0,
      compliancePercentage: targetPercentage(userHours[profile.id] || 0),
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
  // A secondary panel: if its query fails, log it and show an empty panel
  // rather than taking down the whole dashboard.
  let overdueList: any[] = [];
  try {
    overdueList = await fetchOverdueEvaluations(startOfYear, endOfYear);
  } catch (overdueError) {
    console.error('Overdue evaluations query failed:', overdueError);
  }

  // === Available Years ===
  const allPrograms = await fetchAllRows((from, to) =>
    supabase
      .from('programs')
      .select('id, start_date_time')
      .order('id')
      .range(from, to)
  );

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
    totalParticipants: totalParticipations,
    uniqueUsers: uniqueParticipants,
    totalHours,
    compliancePercentage,
    upcomingPrograms: upcomingPrograms || [],
    overdueEvaluations: overdueList,
    hoursByDepartment: hoursByDept,
    departmentCompliance,
    monthlyTrend,
    leaderboard,
    targetStaffCount: targetStaff.length,
    belowTargetCount,
    selectedYear,
    availableYears,
  };
}

export function useEnhancedAdminDashboard(year?: number) {
  const selectedYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['enhanced-admin-dashboard', selectedYear],
    // Keep the previous year on screen while a newly selected year loads
    placeholderData: keepPreviousData,
    queryFn: () => fetchAdminDashboard(selectedYear),
  });
}
