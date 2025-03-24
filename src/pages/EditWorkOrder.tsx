import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { PartsModal } from '../components/workorders/PartsModal';
import { LaborModal } from '../components/workorders/LaborModal';
import { LaborTracker } from '../components/workorders/LaborTracker';
import { PartsTracker } from '../components/workorders/PartsTracker';

interface WorkOrderFormData {
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  asset_type: string;
  asset_id: string;
  due_date: string | null;
  estimated_hours: number | null;
  parts_cost: number | null;
  labor_cost: number | null;
  attachments: string[];
}

interface Vehicle {
  id: string;
  name: string;
  type: string;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
}

const WORK_ORDER_TYPES = [
  'repair',
  'maintenance',
  'inspection',
  'other'
];

const PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent'
];

const STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold'
];

const ASSET_TYPES = [
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'equipment', label: 'Equipment' }
];

const EditWorkOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: '',
    description: '',
    type: 'repair',
    status: 'pending',
    priority: 'medium',
    asset_type: 'vehicle',
    asset_id: '',
    due_date: null,
    estimated_hours: null,
    parts_cost: null,
    labor_cost: null,
    attachments: []
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !id) {
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

        // Fetch work order
        const { data: workOrder, error: workOrderError } = await supabase
          .from('work_orders')
          .select('*')
          .eq('id', id)
          .single();

        if (workOrderError) throw workOrderError;
        if (!workOrder) throw new Error('Work order not found');

        // Format dates for datetime-local input
        const formatDate = (date: string | null) => {
          if (!date) return null;
          return new Date(date).toISOString().slice(0, 16);
        };

        setFormData({
          ...workOrder,
          due_date: formatDate(workOrder.due_date)
        });

        // Fetch vehicles
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('id, name, type')
          .eq('company_id', company.id)
          .eq('status', 'Active');

        if (vehiclesError) throw vehiclesError;
        setVehicles(vehiclesData || []);

        // Fetch equipment
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select('id, name, type')
          .eq('status', 'Active');

        if (equipmentError) throw equipmentError;
        setEquipment(equipmentData || []);

      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !id) {
      setError('Please sign in to update work orders');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      navigate('/app/workorders', {
        state: { message: 'Work order updated successfully', type: 'success' }
      });
    } catch (err: any) {
      console.error('Error updating work order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    // Implement refresh logic here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/app/workorders')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Edit Work Order</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {WORK_ORDER_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  required
                  value={formData.priority}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="asset_type" className="block text-sm font-medium text-gray-700">
                  Asset Type
                </label>
                <select
                  id="asset_type"
                  name="asset_type"
                  required
                  value={formData.asset_type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {ASSET_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="asset_id" className="block text-sm font-medium text-gray-700">
                  Asset
                </label>
                <select
                  id="asset_id"
                  name="asset_id"
                  required
                  value={formData.asset_id}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select asset</option>
                  {formData.asset_type === 'vehicle' ? (
                    vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.type})
                      </option>
                    ))
                  ) : (
                    equipment.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.type})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  id="estimated_hours"
                  name="estimated_hours"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/app/workorders')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Labor Tracking Section */}
      {id && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <LaborTracker workOrderId={id} onUpdate={() => {/* Refresh work order data */}} />
          </div>
        </div>
      )}

      {/* Parts Management Section */}
      {id && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <PartsTracker 
              workOrderId={id} 
              onUpdate={() => {/* Refresh work order data */}}
              onAddParts={() => setShowPartsModal(true)}
            />
          </div>
        </div>
      )}

      {id && (
        <>
          <PartsModal
            isOpen={showPartsModal}
            onClose={() => setShowPartsModal(false)}
            workOrderId={id}
            onPartsAdded={() => {
              setShowPartsModal(false);
              refreshData();
            }}
          />
          <LaborModal
            isOpen={showLaborModal}
            onClose={() => setShowLaborModal(false)}
            workOrderId={id}
            onLaborAdded={() => {
              setShowLaborModal(false);
              refreshData();
            }}
          />
        </>
      )}
    </div>
  );
};

export default EditWorkOrder;