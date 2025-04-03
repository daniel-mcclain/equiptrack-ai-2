import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Ban,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../types/settings';
import { UserTableState } from '../types/user';

interface UserManagementProps {
  showAddModal?: boolean;
  onCloseAddModal?: () => void;
  tableState?: UserTableState;
}

const userSchema = z.object({
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
  isTechnician: z.boolean().optional(),
  jobTitle: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  hourlyRate: z.string().optional()
});

type UserFormData = z.infer<typeof userSchema>;

const UserManagement: React.FC<UserManagementProps> = ({
  showAddModal = false,
  onCloseAddModal
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, selectedCompanyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(showAddModal);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    dateRange: '30'
  });
  // Track if data has been fetched for the current company
  const [dataFetched, setDataFetched] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      isTechnician: false,
      status: 'active',
      role: 'user'
    }
  });

  const isTechnician = watch('isTechnician');

  useEffect(() => {
    const fetchUsers = async () => {
      // If we're already fetching data for this company, don't fetch again
      if (dataFetched === selectedCompanyId && users.length > 0) {
        console.log('Users data already fetched for this company, skipping');
        return;
      }

      if (!isAuthenticated) {
        setUsers([
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            role: 'admin',
            status: 'active',
            last_login: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ]);
        setLoading(false);
        return;
      }

      try {
        if (!selectedCompanyId) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // Fetch users for the current company
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('company_id', selectedCompanyId)
          .order('last_name');

        if (usersError) throw usersError;
        setUsers(usersData || []);
        
        // Mark data as fetched for this company
        setDataFetched(selectedCompanyId);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated, selectedCompanyId, dataFetched, users.length]);

  // Reset dataFetched when selectedCompanyId changes
  useEffect(() => {
    if (selectedCompanyId !== dataFetched) {
      console.log('Company ID changed, resetting users data fetched flag');
      setDataFetched(null);
      setUsers([]);
    }
  }, [selectedCompanyId, dataFetched]);

  useEffect(() => {
    setShowUserModal(showAddModal);
  }, [showAddModal]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (selectedUser && showEditModal) {
        try {
          const { data: techData } = await supabase
            .from('technicians')
            .select('*')
            .eq('user_id', selectedUser.id)
            .maybeSingle();

          setValue('firstName', selectedUser.first_name);
          setValue('lastName', selectedUser.last_name);
          setValue('email', selectedUser.email);
          setValue('role', selectedUser.role);
          setValue('status', selectedUser.status as 'active' | 'inactive' | 'suspended');
          setValue('department', selectedUser.department || '');
          setValue('title', selectedUser.title || '');
          setValue('location', selectedUser.location || '');
          setValue('manager', selectedUser.manager || '');
          setValue('startDate', selectedUser.start_date || '');
          setValue('notes', selectedUser.notes || '');
          setValue('isTechnician', !!techData);
          
          if (techData) {
            setValue('jobTitle', techData.job_title || '');
            setValue('certifications', techData.certifications || []);
            setValue('skills', techData.skills || []);
            setValue('hourlyRate', techData.hourly_rate?.toString() || '');
          }
        } catch (err) {
          console.error('Error fetching user details:', err);
        }
      }
    };

    fetchUserDetails();
  }, [selectedUser, showEditModal, setValue]);

  const handleDisableUser = async (userId: string) => {
    if (!isAuthenticated) {
      setError('Please sign in to manage users');
      return;
    }

    if (!selectedCompanyId) {
      setError('No company selected');
      return;
    }

    // Verify the user belongs to the current company
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingUser) throw new Error('User not found');
    if (existingUser.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: User belongs to a different company');

    setLoading(true);
    setError(null);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      const { error: auditError } = await supabase
        .from('user_audit_logs')
        .insert([{
          user_id: userId,
          action: 'DISABLE_USER',
          details: {
            disabled_at: new Date().toISOString(),
            disabled_by: currentUser.id
          },
          performed_by: currentUser.id
        }]);

      if (auditError) throw auditError;

      setUsers(prev => prev.filter(user => user.id !== userId));
      setSuccess('User disabled successfully');
    } catch (err: any) {
      console.error('Error disabling user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (data: UserFormData) => {
    if (!isAuthenticated || !selectedUser) {
      setError('Please sign in to edit users');
      return;
    }

    if (!selectedCompanyId) {
      setError('No company selected');
      return;
    }

    // Verify the user belongs to the current company
    if (selectedUser.company_id !== selectedCompanyId) {
      setError('Unauthorized: User belongs to a different company');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          status: data.status,
          department: data.department || null,
          title: data.title || null,
          location: data.location || null,
          manager: data.manager || null,
          start_date: data.startDate || null,
          notes: data.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      if (data.isTechnician) {
        const technicianData = {
          user_id: selectedUser.id,
          company_id: selectedCompanyId,
          job_title: data.jobTitle,
          certifications: data.certifications || [],
          skills: data.skills || [],
          hourly_rate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          updated_at: new Date().toISOString()
        };

        const { data: existingTech } = await supabase
          .from('technicians')
          .select('id')
          .eq('user_id', selectedUser.id)
          .maybeSingle();

        if (existingTech) {
          const { error: techUpdateError } = await supabase
            .from('technicians')
            .update(technicianData)
            .eq('user_id', selectedUser.id);

          if (techUpdateError) throw techUpdateError;
        } else {
          const { error: techInsertError } = await supabase
            .from('technicians')
            .insert([technicianData]);

          if (techInsertError) throw techInsertError;
        }
      } else {
        const { error: techDeleteError } = await supabase
          .from('technicians')
          .delete()
          .eq('user_id', selectedUser.id);

        if (techDeleteError) throw techDeleteError;
      }

      const { error: auditError } = await supabase
        .from('user_audit_logs')
        .insert([{
          user_id: currentUser.id,
          action: 'UPDATE_USER',
          details: {
            updated_user_id: selectedUser.id,
            updated_user_email: data.email,
            previous_role: selectedUser.role,
            new_role: data.role,
            previous_status: selectedUser.status,
            new_status: data.status,
            is_technician: data.isTechnician
          },
          performed_by: currentUser.id
        }]);

      if (auditError) throw auditError;

      if (data.role !== selectedUser.role) {
        const { error: roleUpdateError } = await supabase
          .from('user_companies')
          .update({ role: data.role })
          .eq('user_id', selectedUser.id);

        if (roleUpdateError) throw roleUpdateError;
      }

      const { data: updatedUsers, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('last_name');

      if (fetchError) throw fetchError;
      setUsers(updatedUsers || []);

      setShowEditModal(false);
      setSelectedUser(null);
      setSuccess('User updated successfully');
      reset();
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (data: UserFormData) => {
    if (!isAuthenticated) {
      setError('Please sign in to add users');
      return;
    }

    if (!selectedCompanyId) {
      setError('No company selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create verification token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: verificationError } = await supabase
        .from('user_verifications')
        .insert([{
          email: data.email,
          token,
          expires_at: expiresAt.toISOString(),
          user_data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role,
            company_id: selectedCompanyId,
            selected_company_id: selectedCompanyId, // Set selected company to match company
            is_technician: data.isTechnician,
            technician_data: data.isTechnician ? {
              job_title: data.jobTitle,
              hourly_rate: data.hourlyRate
            } : null
          }
        }]);

      if (verificationError) throw verificationError;

      setShowUserModal(false);
      setSuccess('User invitation sent successfully');
      reset();

      // In a real application, you would send an email with the verification link
      console.log('Verification token:', token);

    } catch (err: any) {
      console.error('Error adding user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {!isAuthenticated && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👋 Welcome to the demo! You're viewing sample user data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage users.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setShowUserModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Roles</option>
                {ROLES.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Users List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDisableUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Add New User
                  </h3>
                  <div className="mt-2">
                    <form onSubmit={handleSubmit(handleAddUser)} className="space-y-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <input
                          type="text"
                          {...register('firstName')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <input
                          type="text"
                          {...register('lastName')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          {...register('email')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          {...register('role')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {ROLES.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        {errors.role && (
                          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                        )}
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('isTechnician')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isTechnician" className="ml-2 block text-sm text-gray-900">
                          Register as Technician
                        </label>
                      </div>

                      {isTechnician && (
                        <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
                          <div>
                            <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                              Job Title
                            </label>
                            <input
                              type="text"
                              {...register('jobTitle')}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                              Hourly Rate
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              {...register('hourlyRate')}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          Add User
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserModal(false);
                            reset();
                            onCloseAddModal?.();
                          }}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6  font-medium text-gray-900">
                    Edit User
                  </h3>
                  <div className="mt-2">
                    <form onSubmit={handleSubmit(handleEditUser)} className="space-y-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <input
                          type="text"
                          {...register('firstName')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <input
                          type="text"
                          {...register('lastName')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          {...register('email')}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          {...register('role')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {ROLES.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        {errors.role && (
                          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          {...register('status')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        {errors.status && (
                          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                          Department
                        </label>
                        <input
                          type="text"
                          {...register('department')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                          Title
                        </label>
                        <input
                          type="text"
                          {...register('title')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('isTechnician')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isTechnician" className="ml-2 block text-sm text-gray-900">
                          Register as Technician
                        </label>
                      </div>

                      {isTechnician && (
                        <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
                          <div>
                            <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                              Job Title
                            </label>
                            <input
                              type="text"
                              {...register('jobTitle')}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                              Hourly Rate
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              {...register('hourlyRate')}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditModal(false);
                            setSelectedUser(null);
                            reset();
                          }}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;