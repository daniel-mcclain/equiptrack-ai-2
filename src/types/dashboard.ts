export interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceDue: number;
  uptime: number;
  totalVehiclesChange: number;
  activeVehiclesChange: number;
  maintenanceDueChange: number;
  uptimeChange: number;
}

export interface ActivityItem {
  id: string;
  name: string;
  type: string;
  last_maintenance: string;
  status: string;
}

export interface DashboardCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  change?: number;
  color?: string;
}

export interface FleetStatusProps {
  uptime: number;
  maintenanceDue: number;
  totalVehicles: number;
  isAuthenticated: boolean;
}

export interface RecentActivityProps {
  activities: ActivityItem[];
}