import React from 'react';
import { Truck, PenTool as Tools, AlertTriangle, Clock, TrendingUp, Users, Calendar } from 'lucide-react';

const DashboardCard = ({ icon: Icon, title, value, change, color }: any) => (
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
        {change && (
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
  return (
    <div>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          icon={Truck}
          title="Total Vehicles"
          value="47"
          change={5.2}
          color="text-green-500"
        />
        <DashboardCard
          icon={Tools}
          title="Equipment"
          value="156"
          change={2.1}
          color="text-green-500"
        />
        <DashboardCard
          icon={AlertTriangle}
          title="Maintenance Due"
          value="8"
          change={-12.5}
          color="text-red-500"
        />
        <DashboardCard
          icon={Clock}
          title="Average Uptime"
          value="98.2%"
          change={0.8}
          color="text-green-500"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { icon: Truck, text: 'Vehicle #1234 maintenance completed', time: '2 hours ago' },
              { icon: Tools, text: 'New equipment registered: Forklift F-123', time: '4 hours ago' },
              { icon: Users, text: 'Operator John D. completed certification', time: '5 hours ago' },
              { icon: Calendar, text: 'Scheduled maintenance for Vehicle #5678', time: '6 hours ago' },
            ].map((item, i) => (
              <div key={i} className="flex items-center py-3 border-b last:border-0">
                <div className="p-2 bg-blue-50 rounded-lg mr-4">
                  <item.icon size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-900">{item.text}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Equipment Status</h3>
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
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm font-medium">85%</span>
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
                  <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: '10%' }}></div>
                </div>
                <span className="text-sm font-medium">10%</span>
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
                  <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '5%' }}></div>
                </div>
                <span className="text-sm font-medium">5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;