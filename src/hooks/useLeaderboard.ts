import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function useLeaderboard(currentUserId: string, year?: number) {
  const selectedYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['leaderboard', currentUserId, selectedYear],
    queryFn: async (): Promise<LeaderboardData> => {
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;

      // Get all profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, department');

      if (profilesError) throw profilesError;

      // Get all assignments with program hours for current year
      const { data: assignments, error: assignmentsError } = await supabase
        .from('program_assignments')
        .select(`
          user_id,
          programs!inner(hours, end_date_time)
        `)
        .gte('programs.end_date_time', startOfYear)
        .lte('programs.end_date_time', endOfYear);

      if (assignmentsError) throw assignmentsError;

      // Aggregate hours by user
      const hoursByUser: Record<string, number> = {};
      (assignments || []).forEach((assignment: any) => {
        const userId = assignment.user_id;
        const hours = assignment.programs?.hours || 0;
        hoursByUser[userId] = (hoursByUser[userId] || 0) + hours;
      });

      // Build leaderboard entries
      const usersWithHours = (profiles || []).map((profile: any) => {
        const hoursCompleted = hoursByUser[profile.id] || 0;
        return {
          userId: profile.id,
          name: profile.name || 'Unknown',
          department: profile.department || '-',
          hoursCompleted,
          compliancePercentage: Math.min(Math.round((hoursCompleted / 40) * 100), 100),
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
    },
    enabled: !!currentUserId,
  });
}
