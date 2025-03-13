import { DivideIcon as LucideIcon } from 'lucide-react';

export interface Permission {
  id: string;
  role: string;
  resource: string;
  action: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface TabDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
}

export const ROLES: Role[] = [
  { id: 'admin', name: 'Administrator', description: 'Full system access' },
  { id: 'manager', name: 'Manager', description: 'Department or team manager' },
  { id: 'operator', name: 'Operator', description: 'Vehicle/equipment operator' },
  { id: 'maintenance', name: 'Maintenance', description: 'Maintenance staff' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access' }
];