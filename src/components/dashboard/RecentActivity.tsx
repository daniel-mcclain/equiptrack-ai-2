import React from 'react';
import { Truck } from 'lucide-react';
import type { RecentActivityProps } from '../../types/dashboard';

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      <button className="text-blue-600 hover:text-blue-700">View All</button>
    </div>
    <div className="space-y-4">
      {activities.map((item) => (
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
);