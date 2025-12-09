import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  department?: string;
  grade?: string;
  position?: string;
  status?: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useUsersWithTrainingHours(
  year: number = new Date().getFullYear(),
  fromMonth?: string,
  toMonth?: string
) {
  return useQuery({
    queryKey: ['users-with-training-hours', year, fromMonth, toMonth],
    queryFn: async () => {
      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `)
        .order('name', { ascending: true });

      if (usersError) throw usersError;

      // Determine date range based on year and month filters
      const startMonth = (fromMonth && fromMonth !== 'all') ? parseInt(fromMonth) : 1;
      const endMonth = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;

      const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00`;
      // Get last day of end month
      const lastDay = new Date(year, endMonth, 0).getDate();
      const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}T23:59:59`;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('program_assignments')
        .select(`
          user_id,
          programs:program_id(hours, start_date_time)
        `)
        .gte('programs.start_date_time', startDate)
        .lte('programs.start_date_time', endDate);

      if (assignmentsError) throw assignmentsError;

      // Calculate total hours per user
      const hoursMap: Record<string, number> = {};
      assignments?.forEach((assignment: any) => {
        if (assignment.programs?.hours) {
          hoursMap[assignment.user_id] = (hoursMap[assignment.user_id] || 0) + assignment.programs.hours;
        }
      });

      // Merge hours into users
      return users.map(user => ({
        ...user,
        training_hours: hoursMap[user.id] || 0,
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
          email: input.email,
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
        title: 'Success',
        description: 'User created successfully',
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

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        title: 'Success',
        description: 'User updated successfully',
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

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'employee' }) => {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
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

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        title: 'Success',
        description: 'User deactivated successfully',
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
