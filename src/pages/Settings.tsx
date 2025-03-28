import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Key, 
  Settings as SettingsIcon,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CompanyManagement from '../components/CompanyManagement';
import { SecurityMatrix } from '../components/settings/SecurityMatrix';
import { SettingsTabs } from '../components/settings/SettingsTabs';
import { Permission, ROLES, TabDefinition } from '../types/settings';
import { useAuth } from '../hooks/useAuth';
import { DEMO_PERMISSIONS } from '../data/demoData';
import Profile from './Profile';
import UserManagement from './UserManagement';

const TABS: TabDefinition[] = [
  { id: 'company', name: 'Company', icon: Building2 },
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'users', name: 'Users', icon: Users },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'api', name: 'API Keys', icon: Key }
];

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('company');
  const [permissions, setPermissions] = useState<Permission[]>(DEMO_PERMISSIONS);
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<{
    initialized: boolean;
    adminCreated: boolean;
    error?: string;
  }>({
    initialized: false,
    adminCreated: false
  });

  useEffect(() => {
    const initializeSettings = async () => {
      if (!isAuthenticated) {
        setInitializationStatus({
          initialized: true,
          adminCreated: false
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No user found');

        // Check if user has a company
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (companyError && companyError.code !== 'PGRST116') {
          throw companyError;
        }

        if (!company) {
          // Redirect to company setup if no company exists
          navigate('/setup');
          return;
        }

        // Call create_admin_user_rpc function
        const { data: adminResult, error: adminError } = await supabase.rpc('create_admin_user_rpc');
        
        if (adminError) {
          console.error('Admin creation error:', adminError);
          throw adminError;
        }

        setInitializationStatus({
          initialized: true,
          adminCreated: adminResult?.success || false,
          error: adminResult?.error
        });

        // Fetch permissions if on security tab
        if (activeTab === 'security') {
          const { data: permissionsData, error: permissionsError } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('company_id', company.id);

          if (permissionsError) throw permissionsError;
          
          const transformedPermissions = permissionsData?.map(setting => ({
            id: setting.id,
            role: setting.role,
            resource: setting.resource,
            action: setting.action,
            description: `Allows ${setting.role} to ${setting.action} ${setting.resource}`
          })) || [];

          setPermissions(transformedPermissions);
        }
      } catch (err: any) {
        console.error('Error initializing settings:', err);
        setError(err.message);
        setInitializationStatus(prev => ({
          ...prev,
          error: err.message
        }));
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      initializeSettings();
    }
  }, [activeTab, isAuthenticated, isLoading, navigate]);

  const handlePermissionToggle = async (role: string, resource: string, action: string) => {
    if (!isAuthenticated) {
      setError('Please sign in to manage permissions');
      return;
    }

    const permissionKey = `${role}:${resource}:${action}`;
    const existingPermission = permissions.find(p => 
      p.role === role && p.resource === resource && p.action === action
    );

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!company) throw new Error('No company found');

      const { data: existingSetting } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', company.id)
        .eq('setting_type', 'permission')
        .eq('value', permissionKey)
        .single();

      if (existingPermission) {
        const { error } = await supabase
          .from('company_settings')
          .update({ is_active: false })
          .eq('id', existingPermission.id);

        if (error) throw error;

        setPermissions(prev => prev.filter(p => p.id !== existingPermission.id));
      } else {
        if (existingSetting) {
          const { data, error } = await supabase
            .from('company_settings')
            .update({ 
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSetting.id)
            .select()
            .single();

          if (error) throw error;

          setPermissions(prev => [...prev, {
            id: data.id,
            role,
            resource,
            action,
            description: `Allows ${role} to ${action} ${resource}`
          }]);
        } else {
          const { data, error } = await supabase
            .from('company_settings')
            .insert([{
              company_id: company.id,
              setting_type: 'permission',
              name: `${role} ${action} ${resource}`,
              value: permissionKey,
              description: `Allows ${role} to ${action} ${resource}`,
              is_active: true
            }])
            .select()
            .single();

          if (error) throw error;

          setPermissions(prev => [...prev, {
            id: data.id,
            role,
            resource,
            action,
            description: `Allows ${role} to ${action} ${resource}`
          }]);
        }
      }
    } catch (err: any) {
      console.error('Error updating permission:', err);
      setError(err.message);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanyManagement />;
      case 'profile':
        return <Profile />;
      case 'users':
        return <UserManagement showAddModal={showAddUserModal} onCloseAddModal={() => setShowAddUserModal(false)} />;
      case 'security':
        return (
          <SecurityMatrix
            selectedRole={selectedRole}
            roles={ROLES}
            permissions={permissions}
            onRoleChange={setSelectedRole}
            onPermissionToggle={handlePermissionToggle}
          />
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings coming soon...</p>
          </div>
        );
    }
  };

  if (isLoading) {
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
            👋 Welcome to the demo! You're viewing sample settings data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your own settings.
          </p>
        </div>
      )}

      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your company settings, profile, and preferences
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {initializationStatus.error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Settings initialization warning: {initializationStatus.error}
          </p>
        </div>
      )}

      <SettingsTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
};

export default Settings;