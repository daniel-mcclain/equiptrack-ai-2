import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit2, Trash2, Clock, AlertCircle, CheckCircle, XCircle, PenTool as Tool, DollarSign, Users, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface WorkOrder {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  asset_type: string;
  asset_id: string;
  due_date: string | null;
  description: string | null;
  created_at: string;
  parts_cost: number | null;
  labor_cost: number | null;
  asset_details?: {
    name: string;
  } | null;
}

const WORK_ORDER_TYPES = [
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-gray-100 text-gray-800' }
];

const WorkOrders = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    priority: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  useEffect(() => {
    const fetchWorkOrders = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (!company) throw new Error('No company found');

        // First, get all work orders
        const { data: orders, error: ordersError } = await supabase
          .from('work_orders')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        // Then, for each work order, fetch the asset details based on asset_type
        const workOrdersWithAssets = await Promise.all((orders || []).map(async (order) => {
          let assetDetails = null;
          
          if (order.asset_type === 'vehicle') {
            const { data: vehicle } = await supabase
              .from('vehicles')
              .select('name')
              .eq('id', order.asset_id)
              .single();
            assetDetails = vehicle;
          } else if (order.asset_type === 'equipment') {
            const { data: equipment } = await supabase
              .from('equipment')
              .select('name')
              .eq('id', order.asset_id)
              .single();
            assetDetails = equipment;
          }

          return {
            ...order,
            asset_details: assetDetails
          };
        }));

        setWorkOrders(workOrdersWithAssets);

      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrders();
  }, [isAuthenticated]);

  const handleDeleteWorkOrder = async () => {
    if (!isAuthenticated || !selectedWorkOrder) {
      setError('Please sign in to delete work orders');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', selectedWorkOrder.id);

      if (error) throw error;

      setWorkOrders(prev => prev.filter(wo => wo.id !== selectedWorkOrder.id));
      setShowDeleteModal(false);
      setSelectedWorkOrder(null);
    } catch (err: any) {
      console.error('Error deleting work order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusConfig = STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = PRIORITIES.find(p => p.value === priority);
    return priorityConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const getAssetName = (workOrder: WorkOrder) => {
    return workOrder.asset_details?.name || '-';
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredWorkOrders = workOrders.filter(order => {
    const matchesSearch = (
      order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAssetName(order).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesType = !filters.type || order.type === filters.type;
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesPriority = !filters.priority || order.priority === filters.priority;
    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

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
            👋 Welcome to the demo! You're viewing sample work order data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage work orders.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <button
          onClick={() => navigate('/app/workorders/add')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Work Order
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {WORK_ORDER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                {STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.title}
                      </div>
                      {order.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {order.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {order.type.charAt(0).toUpperCase() + order.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getAssetName(order)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.asset_type.charAt(0).toUpperCase() + order.asset_type.slice(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                        {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Parts: {formatCurrency(order.parts_cost)}
                      </div>
                      <div className="text-sm text-gray-900">
                        Labor: {formatCurrency(order.labor_cost)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/app/workorders/edit/${order.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit work order"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedWorkOrder(order);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete work order"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedWorkOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Delete Work Order
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete the work order "{selectedWorkOrder.title}"? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteWorkOrder}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedWorkOrder(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;