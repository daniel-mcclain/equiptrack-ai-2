import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Edit2,
  Trash2,
  Ban,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import VehicleActionModal from '../components/VehicleActionModal';
import { useAuth } from '../hooks/useAuth';
import { useVehicles } from '../hooks/useVehicles';
import clsx from 'clsx';

interface ModalState {
  isOpen: boolean;
  vehicleId: string | null;
  vehicleName: string;
}

const Vehicles = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, selectedCompanyId, isGlobalAdmin } = useAuth();
  
  useEffect(() => {
    console.log('Vehicles page - Auth state:', {
      isAuthenticated,
      isLoading,
      selectedCompanyId,
      isGlobalAdmin
    });
  }, [isAuthenticated, isLoading, selectedCompanyId, isGlobalAdmin]);
  
  const { 
    vehicles, 
    loading, 
    error: vehiclesError, 
    totalVehicles, 
    maxVehicles,
    refreshData 
  } = useVehicles(isAuthenticated, isLoading, selectedCompanyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type: '',
    status: '',
    tag: '',
    group: ''
  });
  const [error, setError] = useState<string | null>(vehiclesError);

  // Update local error state when vehiclesError changes
  useEffect(() => {
    setError(vehiclesError);
  }, [vehiclesError]);

  // Modal states
  const [disableModal, setDisableModal] = useState<ModalState>({
    isOpen: false,
    vehicleId: null,
    vehicleName: ''
  });
  const [deleteModal, setDeleteModal] = useState<ModalState>({
    isOpen: false,
    vehicleId: null,
    vehicleName: ''
  });

  const handleEditVehicle = (vehicleId: string) => {
    if (!isAuthenticated) {
      setError('Please sign in to edit vehicles');
      return;
    }
    navigate(`/app/vehicles/edit/${vehicleId}`);
  };

  const handleDisableVehicle = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to disable vehicles');
      return;
    }

    if (!disableModal.vehicleId) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ status: 'Inactive' })
        .eq('id', disableModal.vehicleId);

      if (error) throw error;

      await refreshData();
      setDisableModal({ isOpen: false, vehicleId: null, vehicleName: '' });
    } catch (err: any) {
      console.error('Error disabling vehicle:', err);
      setError(err.message);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to delete vehicles');
      return;
    }

    if (!deleteModal.vehicleId) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ status: 'Deleted' })
        .eq('id', deleteModal.vehicleId);

      if (error) throw error;

      await refreshData();
      setDeleteModal({ isOpen: false, vehicleId: null, vehicleName: '' });
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      setError(err.message);
    }
  };

  const handleAddVehicle = () => {
    if (!isAuthenticated) {
      setError('Please sign in to add vehicles');
      return;
    }

    if (totalVehicles >= maxVehicles) {
      setError('Vehicle limit reached for your subscription tier');
      return;
    }

    navigate('/app/vehicles/add');
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = (
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesType = !selectedFilters.type || vehicle.type === selectedFilters.type;
    const matchesStatus = !selectedFilters.status || vehicle.status === selectedFilters.status;
    const matchesGroup = !selectedFilters.group || vehicle.groups.includes(selectedFilters.group);
    const matchesTag = !selectedFilters.tag || vehicle.tags.includes(selectedFilters.tag);
    return matchesSearch && matchesType && matchesStatus && matchesGroup && matchesTag;
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
          As a global administrator, you need to select a company from the dropdown in the sidebar to view vehicles.
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
            👋 Welcome to the demo! You're viewing sample vehicle data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your own fleet.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <button
          onClick={handleAddVehicle}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Vehicle
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
                  placeholder="Search vehicles..."
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
                {Array.from(new Set(vehicles.map(v => v.type))).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={selectedFilters.status}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {Array.from(new Set(vehicles.map(v => v.status))).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select
                value={selectedFilters.group}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, group: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Groups</option>
                {Array.from(new Set(vehicles.flatMap(v => v.groups))).map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>

              <select
                value={selectedFilters.tag}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, tag: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Tags</option>
                {Array.from(new Set(vehicles.flatMap(v => v.tags))).map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {totalVehicles} of {maxVehicles} vehicles
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
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Plate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mileage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.length > 0 ? (
                  filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{vehicle.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {vehicle.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          {
                            'bg-green-100 text-green-800': vehicle.status === 'Active',
                            'bg-yellow-100 text-yellow-800': vehicle.status === 'Maintenance',
                            'bg-red-100 text-red-800': vehicle.status === 'Out of Service',
                            'bg-gray-100 text-gray-800': vehicle.status === 'Inactive'
                          }
                        )}>
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {vehicle.manufacturer} {vehicle.model}
                          </div>
                          <div className="text-sm text-gray-500">{vehicle.year}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle.license_plate || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle.mileage.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {vehicle.groups.map(group => (
                            <span
                              key={group}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                            >
                              {group}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {vehicle.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditVehicle(vehicle.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit vehicle"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDisableModal({
                              isOpen: true,
                              vehicleId: vehicle.id,
                              vehicleName: vehicle.name
                            })}
                            className={clsx(
                              "transition-colors",
                              vehicle.status === 'Inactive'
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-400 hover:text-orange-600"
                            )}
                            title={vehicle.status === 'Inactive' ? 'Vehicle is already inactive' : 'Disable vehicle'}
                            disabled={vehicle.status === 'Inactive'}
                          >
                            <Ban size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              vehicleId: vehicle.id,
                              vehicleName: vehicle.name
                            })}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete vehicle"
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
                      No vehicles found. {isAuthenticated ? 'Add a vehicle to get started.' : 'Sign in to manage your vehicles.'}
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
        onClose={() => setDisableModal({ isOpen: false, vehicleId: null, vehicleName: '' })}
        onConfirm={handleDisableVehicle}
        title="Disable Vehicle"
        message={`Are you sure you want to disable ${disableModal.vehicleName}? This will mark the vehicle as inactive and remove it from active operations.`}
        confirmText="Disable Vehicle"
        confirmButtonClass="bg-orange-600 hover:bg-orange-700"
      />

      {/* Delete Modal */}
      <VehicleActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, vehicleId: null, vehicleName: '' })}
        onConfirm={handleDeleteVehicle}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${deleteModal.vehicleName}? This will remove the vehicle from active operations.`}
        confirmText="Delete Vehicle"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default Vehicles;