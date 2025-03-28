import React from 'react';
import { Truck, PenTool as Tools, AlertTriangle } from 'lucide-react';
import type { FleetStatusProps } from '../../types/dashboard';

export const FleetStatus: React.FC<FleetStatusProps> = ({
  uptime,
  maintenanceDue,
  totalVehicles,
  isAuthenticated
}) => {
  const maintenancePercentage = totalVehicles ? (maintenanceDue / totalVehicles) * 100 : 0;
  const outOfServicePercentage = 100 - uptime;

  return (
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
                style={{ width: `${isAuthenticated ? uptime : 85}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {isAuthenticated ? `${uptime}%` : '85%'}
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
                style={{ width: `${isAuthenticated ? maintenancePercentage : 10}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {isAuthenticated 
                ? `${Math.round(maintenancePercentage)}%`
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
                style={{ width: `${isAuthenticated ? outOfServicePercentage : 5}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {isAuthenticated ? `${outOfServicePercentage}%` : '5%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};