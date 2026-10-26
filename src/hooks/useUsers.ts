import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { getMonthRangeBounds } from '@/lib/dateUtils';
import { countsTowardTarget, hasAdminRole } from '@/lib/trainingTarget';

export interface Profile {
  id: string;
  name: string;
  email: string;
  department: string | null;
  grade: string | null;
  position: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  department?: string;
  grade?: string;
  position?: string;
  role?: 'admin' | 'employee';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  department?: string;
  grade?: string;
  position?: string;
  status?: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () =>
      // Paged: PostgREST returns at most 1,000 rows per request
      fetchAllRows((from, to) =>
        supabase
          .from('profiles')
          .select(`
            *,
            user_roles(role)
          `)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      ),
  });
}

export interface UserWithTrainingHours extends Profile {
  supervisor_id: string | null;
  training_hours: number;
  supervisor_name: string | null;
  is_admin: boolean;
}

/**
 * Every profile with its training hours for a year (or a month range in it) and its
 * supervisor's name. Shared by the Users list and the hours summary report so both
 * always show the same numbers. Hours count every assignment (D1) in the year the
 * program starts.
 */
export async function fetchUsersWithTrainingHours(
  year: number,
  fromMonth?: string,
  toMonth?: string
): Promise<UserWithTrainingHours[]> {
  // Paged reads need a unique tiebreaker in the order, or rows can repeat or go
  // missing between pages
  const users = await fetchAllRows((from, to) =>
    supabase
      .from('profiles')
      .select(`
        *,
        user_roles(role)
      `)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );

  const userMap: Record<string, string> = {};
  users.forEach((user: any) => {
    userMap[user.id] = user.name;
  });

  const startMonth = (fromMonth && fromMonth !== 'all') ? parseInt(fromMonth) : 1;
  const endMonth = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;
  const { start: startDate, end: endDate } = getMonthRangeBounds(year, startMonth, year, endMonth);

  // `!inner` makes the date filter drop assignments outside the period instead of
  // returning them with an empty program
  const assignments = await fetchAllRows((from, to) =>
    supabase
      .from('program_assignments')
      .select(`
        id,
        user_id,
        programs!inner(hours, start_date_time)
      `)
      .gte('programs.start_date_time', startDate)
      .lt('programs.start_date_time', endDate)
      .order('id', { ascending: true })
      .range(from, to)
  );

  const hoursMap: Record<string, number> = {};
  assignments.forEach((assignment: any) => {
    if (assignment.programs?.hours) {
      hoursMap[assignment.user_id] = (hoursMap[assignment.user_id] || 0) + assignment.programs.hours;
    }
  });

  return users.map((user: any) => ({
    ...user,
    training_hours: hoursMap[user.id] || 0,
    supervisor_name: user.supervisor_id ? userMap[user.supervisor_id] || null : null,
    is_admin: hasAdminRole(user.user_roles),
  }));
}

export function useUsersWithTrainingHours(
  year: number = new Date().getFullYear(),
  fromMonth?: string,
  toMonth?: string
) {
  return useQuery({
    // Under 'users' so every user mutation's ['users'] invalidation refreshes it
    queryKey: ['users', 'with-training-hours', year, fromMonth, toMonth],
    queryFn: () => fetchUsersWithTrainingHours(year, fromMonth, toMonth),
  });
}

export interface TargetStaffMember {
  id: string;
  name: string;
  email: string;
  position: string | null;
  department: string | null;
  supervisor_id: string | null;
}

/** Active staff without the admin role — the people the 40-hour target and yearly proposals apply to. */
export function useTargetStaff() {
  return useQuery({
    queryKey: ['users', 'target-staff'],
    queryFn: async (): Promise<TargetStaffMember[]> => {
      const rows = await fetchAllRows((from, to) =>
        supabase
          .from('profiles')
          .select('id, name, email, position, department, supervisor_id, status, user_roles(role)')
          .eq('status', 'active')
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      );
      return rows
        .filter((row) => countsTowardTarget({ status: row.status, is_admin: hasAdminRole(row.user_roles) }))
        .map(({ id, name, email, position, department, supervisor_id }) => ({
          id, name, email, position, department, supervisor_id,
        }));
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (input: Omit<CreateUserInput, 'password'>) => {
      // For MVP: Just create the profile directly without Supabase auth
      // Generate a temporary UUID for the user
      const userId = crypto.randomUUID();

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: input.name,
          email: input.email.toLowerCase().trim(),
          department: input.department || null,
          grade: input.grade || null,
          position: input.position || null,
          status: 'active',
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: input.role || 'employee',
        });

      if (roleError) throw roleError;

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: t.common.success,
        description: t.toasts.userCreated,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.common.errorTitle,
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateUserInput }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      toast({
        title: t.common.success,
        description: t.toasts.userUpdated,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.common.errorTitle,
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: t.common.success,
        description: t.toasts.userDeactivated,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.common.errorTitle,
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
