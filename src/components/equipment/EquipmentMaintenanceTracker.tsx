import React, { useState } from 'react';
import { PenTool as Tool, Calendar, Clock, User, DollarSign, FileText, Plus, Edit2, Trash2, ChevronDown, ChevronUp, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useEquipmentMaintenance } from '../../hooks/useEquipmentMaintenance';
import { motion, AnimatePresence } from 'framer-motion';

interface EquipmentMaintenanceTrackerProps {
  equipmentId: string;
  onUpdate: () => void;
}

const MAINTENANCE_TYPES = [
  'Preventive',
  'Corrective',
  'Predictive',
  'Condition-Based',
  'Emergency',
  'Inspection',
  'Calibration',
  'Other'
];

export const EquipmentMaintenanceTracker: React.FC<EquipmentMaintenanceTrackerProps> = ({ 
  equipmentId, 
  onUpdate 
}) => {
  const { isAuthenticated } = useAuth();
  const { 
    maintenanceRecords, 
    loading, 
    error, 
    addMaintenanceRecord, 
    updateMaintenanceRecord, 
    deleteMaintenanceRecord 
  } = useEquipmentMaintenance(equipmentId, isAuthenticated);

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    maintenance_type: 'Preventive',
    description: '',
    cost: '',
    performed_by: '',
    performed_at: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!formData.description) {
      setFormError('Please provide a description');
      return;
    }
    
    if (!formData.performed_by) {
      setFormError('Please specify who performed the maintenance');
      return;
    }
    
    try {
      await addMaintenanceRecord({
        equipment_id: equipmentId,
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        cost: parseFloat(formData.cost) || 0,
        performed_by: formData.performed_by,
        performed_at: formData.performed_at,
        notes: formData.notes || undefined
      });
      
      setShowAddForm(false);
      setFormData({
        maintenance_type: 'Preventive',
        description: '',
        cost: '',
        performed_by: '',
        performed_at: new Date().toISOString().split('T')[0],
        notes: ''
      });
      onUpdate();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!editingRecord) return;
    
    if (!formData.description) {
      setFormError('Please provide a description');
      return;
    }
    
    if (!formData.performed_by) {
      setFormError('Please specify who performed the maintenance');
      return;
    }
    
    try {
      await updateMaintenanceRecord(editingRecord, {
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        cost: parseFloat(formData.cost),
        performed_by: formData.performed_by,
        performed_at: formData.performed_at,
        notes: formData.notes
      });
      
      setEditingRecord(null);
      setFormData({
        maintenance_type: 'Preventive',
        description: '',
        cost: '',
        performed_by: '',
        performed_at: new Date().toISOString().split('T')[0],
        notes: ''
      });
      onUpdate();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this maintenance record?')) return;
    
    try {
      await deleteMaintenanceRecord(id);
      onUpdate();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const startEditRecord = (record: any) => {
    setFormData({
      maintenance_type: record.maintenance_type,
      description: record.description,
      cost: record.cost.toString(),
      performed_by: record.performed_by,
      performed_at: new Date(record.performed_at).toISOString().split('T')[0],
      notes: record.notes || ''
    });
    setEditingRecord(record.id);
    setShowAddForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none"
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 mr-2" />
          ) : (
            <ChevronDown className="h-5 w-5 mr-2" />
          )}
          <span className="font-medium">Maintenance History</span>
        </button>
        
        {!isExpanded && (
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="text-gray-500">Total Records:</span>{' '}
              <span className="font-medium text-gray-900">{maintenanceRecords.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Maintenance:</span>{' '}
              <span className="font-medium text-gray-900">
                {maintenanceRecords.length > 0 
                  ? formatDate(maintenanceRecords[0].performed_at) 
                  : 'None'}
              </span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600">{formError}</p>
                <button
                  onClick={() => setFormError(null)}
                  className="ml-auto text-red-400 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Maintenance Records</h3>
                {!showAddForm && !editingRecord && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Record
                  </button>
                )}
              </div>

              {(showAddForm || editingRecord) && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    {editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
                  </h4>
                  <form onSubmit={editingRecord ? handleEditRecord : handleAddRecord} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="maintenance_type" className="block text-sm font-medium text-gray-700">
                          Maintenance Type
                        </label>
                        <select
                          id="maintenance_type"
                          name="maintenance_type"
                          value={formData.maintenance_type}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        >
                          {MAINTENANCE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="performed_at" className="block text-sm font-medium text-gray-700">
                          Date Performed
                        </label>
                        <input
                          type="date"
                          id="performed_at"
                          name="performed_at"
                          value={formData.performed_at}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="performed_by" className="block text-sm font-medium text-gray-700">
                          Performed By
                        </label>
                        <input
                          type="text"
                          id="performed_by"
                          name="performed_by"
                          value={formData.performed_by}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                          Cost
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            id="cost"
                            name="cost"
                            value={formData.cost}
                            onChange={handleInputChange}
                            className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <input
                          type="text"
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes (Optional)
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingRecord(null);
                          setFormData({
                            maintenance_type: 'Preventive',
                            description: '',
                            cost: '',
                            performed_by: '',
                            performed_at: new Date().toISOString().split('T')[0],
                            notes: ''
                          });
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                      >
                        {editingRecord ? 'Update Record' : 'Add Record'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {maintenanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performed By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {maintenanceRecords.map(record => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(record.performed_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {record.maintenance_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {record.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.performed_by}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(record.cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => startEditRecord(record)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-900"
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
              ) : (
                <p className="text-gray-500 text-center py-4">No maintenance records found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};