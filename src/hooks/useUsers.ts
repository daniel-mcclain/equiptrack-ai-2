import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { User, UserTableState, UserStats } from '../types/user';

const PAGE_SIZE = 20;

export function useUsers(tableState: UserTableState) {
  const {
    page,
    pageSize = PAGE_SIZE,
    filters,
    sort,
    search,
    selectedUsers
  } = tableState;

  return useQuery({
    queryKey: ['users', { page, pageSize, filters, sort, search }],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.department) {
        query = query.eq('department', filters.department);
      }
      if (filters.location) {
        query = query.eq('location', filters.location);
      }
      if (filters.dateRange) {
        const days = parseInt(filters.dateRange);
        const date = new Date();
        date.setDate(date.getDate() - days);
        query = query.gte('created_at', date.toISOString());
      }

      // Apply search
      if (search) {
        query = query.or(`
          first_name.ilike.%${search}%,
          last_name.ilike.%${search}%,
          email.ilike.%${search}%
        `);
      }

      // Apply sorting
      if (sort.field && sort.direction) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      }

      // Apply pagination
      const from = page * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        users: data as User[],
        totalCount: count || 0
      };
    }
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!company) throw new Error('No company found');

      const stats: UserStats = {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        suspendedUsers: 0,
        newUsersThisMonth: 0,
        loginActivity: [],
        roleDistribution: [],
        departmentDistribution: []
      };

      // Get user counts
      const { data: counts, error: countsError } = await supabase
        .from('users')
        .select('status', { count: 'exact' })
        .eq('company_id', company.id)
        .in('status', ['active', 'inactive', 'suspended']);

      if (countsError) throw countsError;

      stats.totalUsers = counts?.length || 0;
      stats.activeUsers = counts?.filter(u => u.status === 'active').length || 0;
      stats.inactiveUsers = counts?.filter(u => u.status === 'inactive').length || 0;
      stats.suspendedUsers = counts?.filter(u => u.status === 'suspended').length || 0;

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('company_id', company.id)
        .gte('created_at', startOfMonth.toISOString());

      stats.newUsersThisMonth = newUsers || 0;

      // Get login activity for the last 30 days
      const { data: activity } = await supabase
        .from('users')
        .select('last_login')
        .eq('company_id', company.id)
        .not('last_login', 'is', null)
        .gte('last_login', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (activity) {
        const activityMap = new Map<string, number>();
        activity.forEach(({ last_login }) => {
          const date = new Date(last_login!).toISOString().split('T')[0];
          activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        stats.loginActivity = Array.from(activityMap.entries()).map(([date, count]) => ({
          date,
          count
        }));
      }

      // Get role distribution
      const { data: roles } = await supabase
        .from('users')
        .select('role')
        .eq('company_id', company.id);

      if (roles) {
        const roleMap = new Map<string, number>();
        roles.forEach(({ role }) => {
          roleMap.set(role, (roleMap.get(role) || 0) + 1);
        });

        stats.roleDistribution = Array.from(roleMap.entries()).map(([role, count]) => ({
          role,
          count
        }));
      }

      // Get department distribution
      const { data: departments } = await supabase
        .from('users')
        .select('department')
        .eq('company_id', company.id)
        .not('department', 'is', null);

      if (departments) {
        const deptMap = new Map<string, number>();
        departments.forEach(({ department }) => {
          if (department) {
            deptMap.set(department, (deptMap.get(department) || 0) + 1);
          }
        });

        stats.departmentDistribution = Array.from(deptMap.entries()).map(([department, count]) => ({
          department,
          count
        }));
      }

      return stats;
    }
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();

  const addUser = useMutation({
    mutationFn: async (userData: UserFormData) => {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password!,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName
          }
        }
      });

      if (authError) throw authError;

      // Get company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!company) throw new Error('No company found');

      // Create user profile
      const { data, error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user!.id,
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          role: userData.role,
          status: userData.status,
          department: userData.department,
          title: userData.title,
          location: userData.location,
          manager: userData.manager,
          start_date: userData.startDate,
          notes: userData.notes,
          company_id: company.id
        }])
        .select()
        .single();

      if (userError) throw userError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    }
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          status: data.status,
          department: data.department,
          title: data.title,
          location: data.location,
          manager: data.manager,
          start_date: data.startDate,
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('users')
        .update({ status: 'deleted' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    }
  });

  const bulkUpdateUsers = useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: Partial<UserFormData> }) => {
      const { error } = await supabase
        .from('users')
        .update(data)
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    }
  });

  return {
    addUser,
    updateUser,
    deleteUser,
    bulkUpdateUsers
  };
}