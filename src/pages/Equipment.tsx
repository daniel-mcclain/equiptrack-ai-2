import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit2, Trash2, Ban, AlertCircle, PenTool as Tool, Calendar, Clock, Tag, MapPin, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEquipment } from '../hooks/useEquipment';
import VehicleActionModal from '../components/VehicleActionModal';
import clsx from 'clsx';

interface ModalState {
  isOpen: boolean;
  equipmentId: string | null;
  equipmentName: string;
}

const Equipment = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, selectedCompanyId, isGlobalAdmin } = useAuth();
  
  const { 
    equipment, 
    loading, 
    error: equipmentError, 
    totalEquipment,
    refreshData 
  } = useEquipment(isAuthenticated, isLoading, selectedCompanyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type: '',
    status: '',
    location: ''
  });
  const [error, setError] = useState<string | null>(equipmentError);

  // Update local error state when equipmentError changes
  React.useEffect(() => {
    setError(equipmentError);
  }, [equipmentError]);

  // Modal states
  const [disableModal, setDisableModal] = useState<ModalState>({
    isOpen: false,
    equipmentId: null,
    equipmentName: ''
  });
  const [deleteModal, setDeleteModal] = useState<ModalState>({
    isOpen: false,
    equipmentId: null,
    equipmentName: ''
  });

  const handleEditEquipment = (equipmentId: string) => {
    if (!isAuthenticated) {
      setError('Please sign in to edit equipment');
      return;
    }
    navigate(`/app/equipment/edit/${equipmentId}`);
  };

  const handleDisableEquipment = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to disable equipment');
      return;
    }

    if (!disableModal.equipmentId) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .update({ status: 'Inactive' })
        .eq('id', disableModal.equipmentId);

      if (error) throw error;

      await refreshData();
      setDisableModal({ isOpen: false, equipmentId: null, equipmentName: '' });
    } catch (err: any) {
      console.error('Error disabling equipment:', err);
      setError(err.message);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to delete equipment');
      return;
    }

    if (!deleteModal.equipmentId) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .update({ status: 'Deleted' })
        .eq('id', deleteModal.equipmentId);

      if (error) throw error;

      await refreshData();
      setDeleteModal({ isOpen: false, equipmentId: null, equipmentName: '' });
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      setError(err.message);
    }
  };

  const handleAddEquipment = () => {
    if (!isAuthenticated) {
      setError('Please sign in to add equipment');
      return;
    }

    navigate('/app/equipment/add');
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = (
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const matchesType = !selectedFilters.type || item.type === selectedFilters.type;
    const matchesStatus = !selectedFilters.status || item.status === selectedFilters.status;
    const matchesLocation = !selectedFilters.location || 
      (item.location && item.location.toLowerCase().includes(selectedFilters.location.toLowerCase()));
    
    return matchesSearch && matchesType && matchesStatus && matchesLocation;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message for global admins who haven't selected a company
  if (isGlobalAdmin && !selectedCompanyId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-xl font-semibold text-yellow-800 mb-2">Company Selection Required</h2>
        <p className="text-yellow-800">
          As a global administrator, you need to select a company from the dropdown in the sidebar to view equipment.
        </p>
      </div>
    );
  }

  // Show message for regular users who don't have a company assigned
  if (!isGlobalAdmin && !selectedCompanyId) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-800 mb-2">No Company Assigned</h2>
        <p className="text-red-800">
          You don't have a company assigned to your account. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!isAuthenticated && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👋 Welcome to the demo! You're viewing sample equipment data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your own equipment.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Equipment</h1>
        <button
          onClick={handleAddEquipment}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Equipment
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
                  placeholder="Search equipment..."
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
                {Array.from(new Set(equipment.map(e => e.type))).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={selectedFilters.status}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {Array.from(new Set(equipment.map(e => e.status))).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select
                value={selectedFilters.location}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, location: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Locations</option>
                {Array.from(new Set(equipment.map(e => e.location).filter(Boolean))).map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {totalEquipment} equipment items
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEquipment.length > 0 ? (
                  filteredEquipment.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          {
                            'bg-green-100 text-green-800': item.status === 'Available',
                            'bg-blue-100 text-blue-800': item.status === 'In Use',
                            'bg-yellow-100 text-yellow-800': item.status === 'Maintenance',
                            'bg-red-100 text-red-800': item.status === 'Out of Service',
                            'bg-gray-100 text-gray-800': item.status === 'Inactive'
                          }
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.manufacturer} {item.model}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.serial_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.last_maintenance ? new Date(item.last_maintenance).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.next_maintenance ? new Date(item.next_maintenance).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditEquipment(item.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit equipment"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDisableModal({
                              isOpen: true,
                              equipmentId: item.id,
                              equipmentName: item.name
                            })}
                            className={clsx(
                              "transition-colors",
                              item.status === 'Inactive'
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-400 hover:text-orange-600"
                            )}
                            title={item.status === 'Inactive' ? 'Equipment is already inactive' : 'Disable equipment'}
                            disabled={item.status === 'Inactive'}
                          >
                            <Ban size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              equipmentId: item.id,
                              equipmentName: item.name
                            })}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete equipment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No equipment found. {isAuthenticated ? 'Add equipment to get started.' : 'Sign in to manage your equipment.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Disable Modal */}
      <VehicleActionModal
        isOpen={disableModal.isOpen}
        onClose={() => setDisableModal({ isOpen: false, equipmentId: null, equipmentName: '' })}
        onConfirm={handleDisableEquipment}
        title="Disable Equipment"
        message={`Are you sure you want to disable ${disableModal.equipmentName}? This will mark the equipment as inactive and remove it from active operations.`}
        confirmText="Disable Equipment"
        confirmButtonClass="bg-orange-600 hover:bg-orange-700"
      />

      {/* Delete Modal */}
      <VehicleActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, equipmentId: null, equipmentName: '' })}
        onConfirm={handleDeleteEquipment}
        title="Delete Equipment"
        message={`Are you sure you want to delete ${deleteModal.equipmentName}? This will remove the equipment from active operations.`}
        confirmText="Delete Equipment"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default Equipment;