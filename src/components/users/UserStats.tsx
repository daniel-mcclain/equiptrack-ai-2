import React from 'react';
import { BarChart, Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { useUserStats } from '../../hooks/useUsers';
import type { UserStats as UserStatsType } from '../../types/user';

const StatCard = ({ icon: Icon, title, value, change }: {
  icon: React.ElementType;
  title: string;
  value: number | string;
  change?: { value: number; type: 'increase' | 'decrease' };
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        {change && (
          <p className={`mt-2 text-sm ${
            change.type === 'increase' 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {change.type === 'increase' ? '↑' : '↓'} {change.value}%
          </p>
        )}
      </div>
      <div className="p-3 bg-blue-50 rounded-lg">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
    </div>
  </div>
);

export const UserStats = () => {
  const { data: stats, isLoading, error } = useUserStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 h-32" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          Error loading user statistics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Total Users"
          value={stats.totalUsers}
          change={{
            value: Math.round((stats.newUsersThisMonth / stats.totalUsers) * 100),
            type: 'increase'
          }}
        />
        <StatCard
          icon={UserCheck}
          title="Active Users"
          value={stats.activeUsers}
        />
        <StatCard
          icon={UserX}
          title="Inactive Users"
          value={stats.inactiveUsers}
        />
        <StatCard
          icon={AlertTriangle}
          title="Suspended Users"
          value={stats.suspendedUsers}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Role Distribution
          </h3>
          <div className="space-y-4">
            {stats.roleDistribution.map(({ role, count }) => (
              <div key={role} className="flex items-center">
                <span className="flex-1 text-sm text-gray-600">{role}</span>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-blue-600 rounded-full"
                      style={{
                        width: `${(count / stats.totalUsers) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <span className="ml-4 text-sm text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Department Distribution
          </h3>
          <div className="space-y-4">
            {stats.departmentDistribution.map(({ department, count }) => (
              <div key={department} className="flex items-center">
                <span className="flex-1 text-sm text-gray-600">{department}</span>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-green-600 rounded-full"
                      style={{
                        width: `${(count / stats.totalUsers) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <span className="ml-4 text-sm text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Login Activity (Last 30 Days)
        </h3>
        <div className="h-64">
          <div className="h-full flex items-end space-x-2">
            {stats.loginActivity.map(({ date, count }) => {
              const height = `${(count / Math.max(...stats.loginActivity.map(a => a.count))) * 100}%`;
              return (
                <div
                  key={date}
                  className="flex-1 bg-blue-100 rounded-t hover:bg-blue-200 transition-colors"
                  style={{ height }}
                  title={`${date}: ${count} logins`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};