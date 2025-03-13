import { z } from 'zod';

export const userSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.string(),
  status: z.enum(['active', 'inactive', 'suspended']),
  department: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  manager: z.string().optional(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

export type UserFormData = z.infer<typeof userSchema>;

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  title?: string;
  location?: string;
  manager?: string;
  start_date?: string;
  notes?: string;
  permissions?: string[];
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  performed_by: string;
  created_at: string;
}

export interface UserFilters {
  role: string;
  status: string;
  department: string;
  dateRange: string;
  location: string;
}

export interface UserSort {
  field: keyof User;
  direction: 'asc' | 'desc';
}

export interface UserTableState {
  page: number;
  pageSize: number;
  filters: UserFilters;
  sort: UserSort;
  search: string;
  selectedUsers: string[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  newUsersThisMonth: number;
  loginActivity: {
    date: string;
    count: number;
  }[];
  roleDistribution: {
    role: string;
    count: number;
  }[];
  departmentDistribution: {
    department: string;
    count: number;
  }[];
}