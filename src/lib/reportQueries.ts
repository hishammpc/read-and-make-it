// Data for the admin Reports page. Rows keep raw values (ISO dates, numbers, codes);
// the page formats them for screen, CSV and PDF.
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { getMonthRangeBounds } from '@/lib/dateUtils';
import { fetchUsersWithTrainingHours } from '@/hooks/useUsers';
import { countsTowardTarget, isTargetMet, targetPercentage } from '@/lib/trainingTarget';

export type ReportRow = Record<string, string | number | null>;

// Same numbers as the Users list: one row per active non-admin staff member, 0 h included
export async function generateStaffHoursSummary(year: number, from: string, to: string): Promise<ReportRow[]> {
  const users = await fetchUsersWithTrainingHours(year, from, to);
  return users.filter((user) => countsTowardTarget(user)).map((user) => ({
    name: user.name,
    position: user.position || '',
    supervisor: user.supervisor_name || '',
    hours: user.training_hours,
    target_percent: targetPercentage(user.training_hours),
    target_status: isTargetMet(user.training_hours) ? 'met' : 'below',
  }));
}

export async function generateTrainingHoursByUser(startDate: string, endDate: string): Promise<ReportRow[]> {
  // Every assignment (no status filter) on programs starting in the period
  const assignments = await fetchAllRows((from, to) =>
    supabase
      .from('program_assignments')
      .select(`
        id,
        user_id,
        profiles:user_id (
          id,
          name
        ),
        programs!inner (
          id,
          title,
          hours,
          start_date_time,
          end_date_time,
          notify_for_evaluation
        )
      `)
      .gte('programs.start_date_time', startDate)
      .lt('programs.start_date_time', endDate)
      .order('id')
      .range(from, to)
  );

  const evaluations = await fetchAllRows((from, to) =>
    supabase
      .from('evaluations')
      .select('id, user_id, program_id')
      .order('id')
      .range(from, to)
  );

  const completedEvaluations = new Set(evaluations.map((e) => `${e.user_id}-${e.program_id}`));

  const result: ReportRow[] = [];
  assignments.forEach((assignment: any) => {
    const profile = assignment.profiles;
    const program = assignment.programs;
    if (!profile || !program) return;

    const evaluation = !program.notify_for_evaluation
      ? 'not_required'
      : completedEvaluations.has(`${assignment.user_id}-${program.id}`)
        ? 'done'
        : 'pending';

    result.push({
      name: profile.name || 'N/A',
      program: program.title || 'N/A',
      hours: program.hours || 0,
      start_date: program.start_date_time,
      end_date: program.end_date_time,
      evaluation,
    });
  });

  return result;
}

export async function generateProgramList(startDate: string, endDate: string): Promise<ReportRow[]> {
  const programs = await fetchAllRows((from, to) =>
    supabase
      .from('programs')
      .select(`
        id,
        title,
        hours,
        start_date_time,
        end_date_time,
        program_assignments(count)
      `)
      .gte('start_date_time', startDate)
      .lt('start_date_time', endDate)
      .order('start_date_time', { ascending: false })
      .order('id')
      .range(from, to)
  );

  return programs.map((program: any) => {
    const participants = program.program_assignments?.[0]?.count || 0;
    return {
      title: program.title,
      start_date: program.start_date_time,
      end_date: program.end_date_time,
      hours: program.hours || 0,
      participants,
      total_hours: (program.hours || 0) * participants,
    };
  });
}

export async function generateProgramOverseas(fromYear: number, toYearParam: number): Promise<ReportRow[]> {
  const { start: startDate, end: endDate } = getMonthRangeBounds(fromYear, 1, toYearParam, 12);

  const assignments = await fetchAllRows((from, to) =>
    supabase
      .from('program_assignments')
      .select(`
        id,
        profiles:user_id (
          name,
          position
        ),
        programs!inner (
          id,
          title,
          training_type,
          location,
          start_date_time,
          end_date_time
        )
      `)
      .eq('programs.training_type', 'International')
      .gte('programs.start_date_time', startDate)
      .lt('programs.start_date_time', endDate)
      .order('id')
      .range(from, to)
  );

  const result: ReportRow[] = [];
  assignments.forEach((assignment: any) => {
    const profile = assignment.profiles;
    const program = assignment.programs;
    if (!profile || !program) return;

    result.push({
      name: profile.name || 'N/A',
      position: profile.position || 'N/A',
      program: program.title || 'N/A',
      start_date: program.start_date_time,
      end_date: program.end_date_time,
      location: program.location || 'N/A',
    });
  });

  return result;
}
