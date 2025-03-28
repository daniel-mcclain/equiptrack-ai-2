import React from 'react';
import { Truck, PenTool as Tools, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { FleetStatus } from '../components/dashboard/FleetStatus';
import { RecentActivity } from '../components/dashboard/RecentActivity';

const Dashboard = () => {
  const { isAuthenticated, isLoading, selectedCompanyId } = useAuth();
  const { loading, error, stats, recentActivity } = useDashboard(
    isAuthenticated,
    isLoading,
    selectedCompanyId
  );

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
            👋 Welcome to the demo! You're viewing sample data to explore the dashboard's features. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your own fleet.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-white text-gray-600 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            Last 30 Days
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          icon={Truck}
          title="Total Vehicles"
          value={stats.totalVehicles}
          change={stats.totalVehiclesChange}
          color={stats.totalVehiclesChange >= 0 ? "text-green-500" : "text-red-500"}
        />
        <DashboardCard
          icon={Tools}
          title="Active Vehicles"
          value={stats.activeVehicles}
          change={stats.activeVehiclesChange}
          color={stats.activeVehiclesChange >= 0 ? "text-green-500" : "text-red-500"}
        />
        <DashboardCard
          icon={AlertTriangle}
          title="Maintenance Due"
          value={stats.maintenanceDue}
          change={stats.maintenanceDueChange}
          color={stats.maintenanceDueChange <= 0 ? "text-green-500" : "text-red-500"}
        />
        <DashboardCard
          icon={Clock}
          title="Average Uptime"
          value={`${stats.uptime}%`}
          change={stats.uptimeChange}
          color={stats.uptimeChange >= 0 ? "text-green-500" : "text-red-500"}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivity} />
        <FleetStatus
          uptime={stats.uptime}
          maintenanceDue={stats.maintenanceDue}
          totalVehicles={stats.totalVehicles}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
};

export default Dashboard;