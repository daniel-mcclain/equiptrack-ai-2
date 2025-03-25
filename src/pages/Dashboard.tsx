import React, { useState, useEffect } from 'react';
import { Truck, PenTool as Tools, AlertTriangle, Clock, TrendingUp, Users, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { DEMO_VEHICLES, DEMO_ACTIVITY, DEMO_STATS } from '../data/demoData';

const DashboardCard = ({ icon: Icon, title, value, change, color }: any) => (
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
        {change !== undefined && (
          <p className={`text-sm ${color} mt-2 flex items-center`}>
            <TrendingUp size={16} className="mr-1" />
            {change > 0 ? '+' : ''}{change}% from last month
          </p>
        )}
      </div>
      <div className="p-3 bg-blue-50 rounded-lg">
        <Icon size={24} className="text-blue-600" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceDue: 0,
    uptime: 0,
    totalVehiclesChange: 0,
    activeVehiclesChange: 0,
    maintenanceDueChange: 0,
    uptimeChange: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) {
        setStats({
          totalVehicles: DEMO_STATS.totalVehicles,
          activeVehicles: DEMO_STATS.activeVehicles,
          maintenanceDue: DEMO_STATS.maintenanceDue,
          uptime: DEMO_STATS.uptime,
          totalVehiclesChange: 5.2,
          activeVehiclesChange: 2.1,
          maintenanceDueChange: -12.5,
          uptimeChange: 0.8
        });
        setRecentActivity(DEMO_ACTIVITY);
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's company
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (!company) return;

        // Calculate date ranges
        const now = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const maintenanceDueDate = new Date();
        maintenanceDueDate.setDate(maintenanceDueDate.getDate() + 7); // Due within next 7 days

        // Get current counts
        const { count: currentTotal } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id);

        const { count: currentActive } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id)
          .eq('status', 'Active');

        const { count: currentMaintenance } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id)
          .lt('next_maintenance', maintenanceDueDate.toISOString());

        // Get last month's counts
        const { count: lastMonthTotal } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id)
          .lte('created_at', lastMonth.toISOString());

        const { count: lastMonthActive } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id)
          .eq('status', 'Active')
          .lte('created_at', lastMonth.toISOString());

        const { count: lastMonthMaintenance } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id)
          .lt('next_maintenance', lastMonth.toISOString());

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number) => {
          return previous ? Math.round(((current - previous) / previous) * 1000) / 10 : 0;
        };

        // Calculate uptime based on vehicle statuses
        const { count: totalVehicles } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id);

        const { count: outOfServiceVehicles } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', company.id)
          .in('status', ['Maintenance', 'Out of Service']);

        const currentUptime = totalVehicles ? 
          Math.round(((totalVehicles - outOfServiceVehicles) / totalVehicles) * 1000) / 10 : 
          100;

        // Get last month's uptime from technical_metrics if available
        const { data: lastMonthUptimeData } = await supabase
          .from('technical_metrics')
          .select('metric_value')
          .eq('company_id', company.id)
          .eq('metric_type', 'uptime')
          .eq('metric_name', 'fleet_uptime')
          .eq('component', 'fleet')  // Add component field
          .lte('timestamp', lastMonth.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);

        const lastMonthUptime = lastMonthUptimeData?.[0]?.metric_value || currentUptime;

        // Store current uptime for next month's comparison
        await supabase
          .from('technical_metrics')
          .insert([{
            company_id: company.id,
            metric_type: 'uptime',
            metric_name: 'fleet_uptime',
            metric_value: currentUptime,
            unit: 'percentage',
            component: 'fleet'  // Add component field
          }]);

        setStats({
          totalVehicles: currentTotal || 0,
          activeVehicles: currentActive || 0,
          maintenanceDue: currentMaintenance || 0,
          uptime: currentUptime,
          totalVehiclesChange: calculateChange(currentTotal || 0, lastMonthTotal || 0),
          activeVehiclesChange: calculateChange(currentActive || 0, lastMonthActive || 0),
          maintenanceDueChange: calculateChange(currentMaintenance || 0, lastMonthMaintenance || 0),
          uptimeChange: calculateChange(currentUptime, lastMonthUptime)
        });

        // Get recent activity
        const { data: activity } = await supabase
          .from('vehicles')
          .select(`
            id,
            name,
            type,
            last_maintenance,
            status
          `)
          .eq('company_id', company.id)
          .order('last_maintenance', { ascending: false })
          .limit(4);

        setRecentActivity(activity || []);

      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, isLoading]);

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
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((item: any) => (
              <div key={item.id} className="flex items-center py-3 border-b last:border-0">
                <div className="p-2 bg-blue-50 rounded-lg mr-4">
                  <Truck size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {item.name} - {item.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last maintenance: {new Date(item.last_maintenance).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Fleet Status</h3>
            <button className="text-blue-600 hover:text-blue-700">View Details</button>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg mr-3">
                  <Truck size={16} className="text-green-600" />
                </div>
                <span className="text-sm font-medium">Operational</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ 
                      width: `${isAuthenticated ? stats.uptime : 85}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {isAuthenticated ? `${stats.uptime}%` : '85%'}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-50 rounded-lg mr-3">
                  <Tools size={16} className="text-yellow-600" />
                </div>
                <span className="text-sm font-medium">Under Maintenance</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-yellow-500 h-2.5 rounded-full" 
                    style={{ 
                      width: `${isAuthenticated ? (stats.maintenanceDue / stats.totalVehicles) * 100 : 10}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {isAuthenticated 
                    ? `${Math.round((stats.maintenanceDue / stats.totalVehicles) * 100)}%`
                    : '10%'
                  }
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg mr-3">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <span className="text-sm font-medium">Out of Service</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-red-500 h-2.5 rounded-full" 
                    style={{ 
                      width: `${isAuthenticated ? 100 - stats.uptime : 5}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {isAuthenticated ? `${100 - stats.uptime}%` : '5%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;