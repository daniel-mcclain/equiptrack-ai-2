import React from 'react';
import { Check, Users, X } from 'lucide-react';
import { Permission, Role } from '../../types/settings';

interface SecurityMatrixProps {
  selectedRole: string;
  roles: Role[];
  permissions: Permission[];
  onRoleChange: (role: string) => void;
  onPermissionToggle: (role: string, resource: string, action: string) => void;
}

const RESOURCES = [
  { id: 'vehicles', name: 'Vehicles', description: 'Vehicle management' },
  { id: 'equipment', name: 'Equipment', description: 'Equipment management' },
  { id: 'maintenance', name: 'Maintenance', description: 'Maintenance schedules and records' },
  { id: 'work_orders', name: 'Work Orders', description: 'Work order management' },
  { id: 'parts_inventory', name: 'Parts Inventory', description: 'Inventory management' },
  { id: 'reports', name: 'Reports', description: 'Reports and analytics' },
  { id: 'settings', name: 'Settings', description: 'System settings' }
];

const ACTIONS = [
  { id: 'view', name: 'View', description: 'Can view records' },
  { id: 'create', name: 'Create', description: 'Can create new records' },
  { id: 'edit', name: 'Edit', description: 'Can edit existing records' },
  { id: 'delete', name: 'Delete', description: 'Can delete records' }
];

export const SecurityMatrix: React.FC<SecurityMatrixProps> = ({
  selectedRole,
  roles,
  permissions,
  onRoleChange,
  onPermissionToggle
}) => {
  const hasPermission = (role: string, resource: string, action: string) => {
    return permissions.some(p => 
      p.role === role && p.resource === resource && p.action === action
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-48 h-10 pl-4 pr-8 text-base rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
        <h3 className="text-lg font-medium text-gray-900">Permission Matrix</h3>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              {ACTIONS.map(action => (
                <th key={action.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {action.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {RESOURCES.map(resource => (
              <tr key={resource.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {resource.name}
                    </div>
                  </div>
                </td>
                {ACTIONS.map(action => (
                  <td key={action.id} className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onPermissionToggle(selectedRole, resource.id, action.id)}
                      className={`p-2 rounded-md transition-colors ${
                        hasPermission(selectedRole, resource.id, action.id)
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {hasPermission(selectedRole, resource.id, action.id) ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 space-y-4">
        <h4 className="text-lg font-medium text-gray-900">Role Descriptions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => onRoleChange(role.id)}
              className={`text-left bg-white p-4 rounded-lg shadow-sm transition-all ${
                selectedRole === role.id 
                  ? 'ring-2 ring-blue-500 shadow-md' 
                  : 'hover:shadow-md hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className={`h-5 w-5 ${
                  selectedRole === role.id ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <h5 className={`text-sm font-medium ${
                  selectedRole === role.id ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {role.name}
                </h5>
              </div>
              <p className={`mt-2 text-sm ${
                selectedRole === role.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {role.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};