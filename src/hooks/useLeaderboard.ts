import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { getYearBounds } from '@/lib/dateUtils';
import { countsTowardTarget, hasAdminRole, targetPercentage } from '@/lib/trainingTarget';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  department: string;
  hoursCompleted: number;
  compliancePercentage: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardData {
  topTen: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  isCurrentUserInTopTen: boolean;
}

export async function fetchLeaderboard(currentUserId: string, selectedYear: number): Promise<LeaderboardData> {
  const { start: startOfYear, end: endOfYear } = getYearBounds(selectedYear);

  // Get all profiles first (paginated to bypass the 1000-row cap)
  const profiles = await fetchAllRows((from, to) =>
    supabase
      .from('profiles')
      .select('id, name, department, status, user_roles(role)')
      .order('id')
      .range(from, to)
  );

  // Get all assignments with program hours for current year (paginated —
  // without this the leaderboard sums a truncated set and undercounts hours)
  const assignments = await fetchAllRows((from, to) =>
    supabase
      .from('program_assignments')
      .select(`
        id,
        user_id,
        programs!inner(hours, start_date_time)
      `)
      .gte('programs.start_date_time', startOfYear)
      .lt('programs.start_date_time', endOfYear)
      .order('id')
      .range(from, to)
  );

  // Aggregate hours by user
  const hoursByUser: Record<string, number> = {};
  (assignments || []).forEach((assignment: any) => {
    const userId = assignment.user_id;
    const hours = assignment.programs?.hours || 0;
    hoursByUser[userId] = (hoursByUser[userId] || 0) + hours;
  });

  // Build leaderboard entries: only staff the 40-hour target applies to (active, not admin)
  const targetStaff = (profiles || []).filter((profile) =>
    countsTowardTarget({ status: profile.status, is_admin: hasAdminRole(profile.user_roles) })
  );
  const usersWithHours = targetStaff.map((profile: any) => {
    const hoursCompleted = hoursByUser[profile.id] || 0;
    return {
      userId: profile.id,
      name: profile.name || 'Unknown',
      department: profile.department || '-',
      hoursCompleted,
      compliancePercentage: targetPercentage(hoursCompleted),
    };
  });

  // Sort by hours descending
  usersWithHours.sort((a, b) => b.hoursCompleted - a.hoursCompleted);

  // Add ranks
  const rankedUsers: LeaderboardEntry[] = usersWithHours.map((user, index) => ({
    ...user,
    rank: index + 1,
    isCurrentUser: user.userId === currentUserId,
  }));

  // Get top 10
  const topTen = rankedUsers.slice(0, 10);

  // Check if current user is in top 10
  const currentUserInTopTen = topTen.some(u => u.userId === currentUserId);

  // Get current user's entry if not in top 10
  let currentUserEntry: LeaderboardEntry | null = null;
  if (!currentUserInTopTen) {
    currentUserEntry = rankedUsers.find(u => u.userId === currentUserId) || null;
  }

  return {
    topTen,
    currentUserEntry,
    isCurrentUserInTopTen: currentUserInTopTen,
  };
}

export function useLeaderboard(currentUserId: string, year?: number) {
  const selectedYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['leaderboard', currentUserId, selectedYear],
    placeholderData: keepPreviousData,
    queryFn: () => fetchLeaderboard(currentUserId, selectedYear),
    enabled: !!currentUserId,
  });
}
