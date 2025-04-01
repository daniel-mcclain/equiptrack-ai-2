import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Edit2,
  Trash2,
  Ban,
  AlertCircle,
  Check,
  Pause,
  Play
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWorkOrder } from '../hooks/useWorkOrder';
import VehicleActionModal from '../components/VehicleActionModal';
import clsx from 'clsx';

interface ModalState {
  isOpen: boolean;
  workOrderId: string | null;
  workOrderTitle: string;
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
  const { isAuthenticated, isLoading, selectedCompanyId, isGlobalAdmin } = useAuth();
  const { 
    workOrders,
    loading,
    error,
    deleteWorkOrder,
    completeWorkOrder,
    cancelWorkOrder,
    holdWorkOrder,
    resumeWorkOrder
  } = useWorkOrder(isAuthenticated, isLoading, selectedCompanyId, isGlobalAdmin);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type: '',
    status: '',
    priority: ''
  });

  const [deleteModal, setDeleteModal] = useState<ModalState>({
    isOpen: false,
    workOrderId: null,
    workOrderTitle: ''
  });

  const handleAddWorkOrder = () => {
    if (!isAuthenticated) {
      return;
    }

    if (isGlobalAdmin && !selectedCompanyId) {
      return;
    }

    navigate('/app/workorders/add');
  };

  const handleEditWorkOrder = (id: string) => {
    if (!isAuthenticated) return;
    navigate(`/app/workorders/edit/${id}`);
  };

  const handleDeleteWorkOrder = async () => {
    if (!isAuthenticated || !deleteModal.workOrderId) return;

    try {
      await deleteWorkOrder(deleteModal.workOrderId);
      setDeleteModal({ isOpen: false, workOrderId: null, workOrderTitle: '' });
    } catch (err: any) {
      console.error('Error deleting work order:', err);
    }
  };

  const handleStatusChange = async (id: string, action: 'complete' | 'cancel' | 'hold' | 'resume') => {
    if (!isAuthenticated) return;

    try {
      switch (action) {
        case 'complete':
          await completeWorkOrder(id);
          break;
        case 'cancel':
          await cancelWorkOrder(id);
          break;
        case 'hold':
          await holdWorkOrder(id);
          break;
        case 'resume':
          await resumeWorkOrder(id);
          break;
      }
    } catch (err: any) {
      console.error('Error updating work order status:', err);
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

  const getAssetName = (workOrder: any) => {
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
    const matchesType = !selectedFilters.type || order.type === selectedFilters.type;
    const matchesStatus = !selectedFilters.status || order.status === selectedFilters.status;
    const matchesPriority = !selectedFilters.priority || order.priority === selectedFilters.priority;
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

      {isGlobalAdmin && !selectedCompanyId && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Please select a company from the dropdown in the sidebar to view work orders.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <button
          onClick={handleAddWorkOrder}
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
                value={selectedFilters.type}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, type: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {WORK_ORDER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <select
                value={selectedFilters.status}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                {STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>

              <select
                value={selectedFilters.priority}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, priority: e.target.value }))}
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
                          onClick={() => handleEditWorkOrder(order.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit work order"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {order.status !== 'completed' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'complete')}
                            className="text-green-600 hover:text-green-900"
                            title="Complete work order"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {order.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'hold')}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Put on hold"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )}
                        {order.status === 'on_hold' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'resume')}
                            className="text-blue-600 hover:text-blue-900"
                            title="Resume work order"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {order.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'cancel')}
                            className="text-gray-400 hover:text-orange-600"
                            title="Cancel work order"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteModal({
                              isOpen: true,
                              workOrderId: order.id,
                              workOrderTitle: order.title
                            });
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
      <VehicleActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, workOrderId: null, workOrderTitle: '' })}
        onConfirm={handleDeleteWorkOrder}
        title="Delete Work Order"
        message={`Are you sure you want to delete the work order "${deleteModal.workOrderTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default WorkOrders;