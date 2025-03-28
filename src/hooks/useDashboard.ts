import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { DashboardStats, ActivityItem } from '../types/dashboard';
import { DEMO_STATS, DEMO_ACTIVITY } from '../data/demoData';

interface UseDashboardResult {
  loading: boolean;
  error: string | null;
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

export const useDashboard = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null
): UseDashboardResult => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceDue: 0,
    uptime: 0,
    totalVehiclesChange: 0,
    activeVehiclesChange: 0,
    maintenanceDueChange: 0,
    uptimeChange: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

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

        // Get company ID - either selected company for global admin or user's company
        const { data: userData } = await supabase
          .from('users')
          .select('company_id, is_global_admin')
          .eq('id', user.id)
          .single();

        const companyId = selectedCompanyId || userData?.company_id;
        if (!companyId) return;

        // Calculate date ranges
        const now = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const maintenanceDueDate = new Date();
        maintenanceDueDate.setDate(maintenanceDueDate.getDate() + 7);

        // Get current counts
        const { count: currentTotal } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId);

        const { count: currentActive } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('status', 'Active');

        const { count: currentMaintenance } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .lt('next_maintenance', maintenanceDueDate.toISOString());

        // Get last month's counts
        const { count: lastMonthTotal } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .lte('created_at', lastMonth.toISOString());

        const { count: lastMonthActive } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('status', 'Active')
          .lte('created_at', lastMonth.toISOString());

        const { count: lastMonthMaintenance } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .lt('next_maintenance', lastMonth.toISOString());

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number) => {
          return previous ? Math.round(((current - previous) / previous) * 1000) / 10 : 0;
        };

        // Calculate uptime based on vehicle statuses
        const { count: totalVehicles } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId);

        const { count: outOfServiceVehicles } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .in('status', ['Maintenance', 'Out of Service']);

        const currentUptime = totalVehicles ? 
          Math.round(((totalVehicles - outOfServiceVehicles) / totalVehicles) * 1000) / 10 : 
          100;

        // Get last month's uptime from technical_metrics
        const { data: lastMonthUptimeData } = await supabase
          .from('technical_metrics')
          .select('metric_value')
          .eq('company_id', companyId)
          .eq('metric_type', 'uptime')
          .eq('metric_name', 'fleet_uptime')
          .eq('component', 'fleet')
          .lte('timestamp', lastMonth.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);

        const lastMonthUptime = lastMonthUptimeData?.[0]?.metric_value || currentUptime;

        // Store current uptime
        await supabase
          .from('technical_metrics')
          .insert([{
            company_id: companyId,
            metric_type: 'uptime',
            metric_name: 'fleet_uptime',
            metric_value: currentUptime,
            unit: 'percentage',
            component: 'fleet'
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
          .eq('company_id', companyId)
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
  }, [isAuthenticated, isLoading, selectedCompanyId]);

  return { loading, error, stats, recentActivity };
};