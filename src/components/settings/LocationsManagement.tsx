import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  MapPin, 
  RefreshCw, 
  Filter, 
  ArrowUpDown,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLocations } from '../../hooks/useLocations';
import { Location, LocationFormData } from '../../types/location';
import clsx from 'clsx';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LocationFormData) => Promise<void>;
  initialData?: Partial<LocationFormData>;
  title: string;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

const COUNTRIES = [
  { code: 'USA', name: 'United States' },
  { code: 'CAN', name: 'Canada' },
  { code: 'MEX', name: 'Mexico' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'AUS', name: 'Australia' }
];

/**
 * Modal component for adding or editing a location
 */
const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = {
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    status: 'active'
  },
  title
}) => {
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Only initialize the form when the modal opens or initialData changes
  useEffect(() => {
    if (isOpen && !isInitialized) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        country: initialData.country || 'USA',
        postal_code: initialData.postal_code || '',
        status: initialData.status || 'active'
      });
      setError(null);
      setIsInitialized(true);
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      console.error('Error submitting location:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" onClick={(e) => e.stopPropagation()}>
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>

              {error && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <X className="h-5 w-5 text-red-400" />
                    <p className="ml-2 text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Location Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Street Address*
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City*
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State/Province*
                    </label>
                    <select
                      id="state"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(state => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country*
                    </label>
                    <select
                      id="country"
                      name="country"
                      required
                      value={formData.country}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                      Postal Code*
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      name="postal_code"
                      required
                      value={formData.postal_code}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal component for confirming location deletions
 */
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  locationName: string;
  isMultiple?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  locationName,
  isMultiple = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Error deleting location:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" onClick={(e) => e.stopPropagation()}>
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isMultiple ? 'Delete Locations' : 'Delete Location'}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {isMultiple 
                    ? 'Are you sure you want to delete the selected locations? This action cannot be undone.'
                    : `Are you sure you want to delete "${locationName}"? This action cannot be undone.`}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <X className="h-5 w-5 text-red-400" />
                <p className="ml-2 text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main component for managing locations
 */
export const LocationsManagement: React.FC = () => {
  const { isAuthenticated, isLoading, selectedCompanyId } = useAuth();
  const { 
    locations, 
    loading, 
    error, 
    totalLocations, 
    refreshData,
    addLocation,
    updateLocation,
    deleteLocation,
    bulkUpdateLocations
  } = useLocations(isAuthenticated, isLoading, selectedCompanyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    state: '',
    city: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'name' as keyof Location,
    direction: 'asc' as 'asc' | 'desc'
  });
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    locationId: '',
    locationName: '',
    isMultiple: false
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Handles sorting when a column header is clicked
   */
  const handleSort = (key: keyof Location) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  /**
   * Handles adding a new location
   */
  const handleAddLocation = async (data: LocationFormData) => {
    await addLocation(data);
  };

  /**
   * Handles updating an existing location
   */
  const handleUpdateLocation = async (data: LocationFormData) => {
    if (!editingLocation) return;
    await updateLocation(editingLocation.id, data);
    setEditingLocation(null);
  };

  /**
   * Handles deleting a location or multiple locations
   */
  const handleDeleteLocation = async () => {
    if (deleteModalState.isMultiple) {
      // Bulk delete
      await Promise.all(selectedLocations.map(id => deleteLocation(id)));
      setSelectedLocations([]);
    } else {
      // Single delete
      await deleteLocation(deleteModalState.locationId);
    }
    setDeleteModalState({
      isOpen: false,
      locationId: '',
      locationName: '',
      isMultiple: false
    });
  };

  /**
   * Handles changing the status of multiple locations
   */
  const handleBulkStatusChange = async (status: 'active' | 'inactive') => {
    if (selectedLocations.length === 0) return;
    await bulkUpdateLocations(selectedLocations, { status });
    setSelectedLocations([]);
  };

  /**
   * Refreshes the locations data
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  /**
   * Handles selecting or deselecting all locations
   */
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLocations(filteredLocations.map(loc => loc.id));
    } else {
      setSelectedLocations([]);
    }
  };

  /**
   * Handles selecting or deselecting a single location
   */
  const handleSelectLocation = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations(prev => [...prev, id]);
    } else {
      setSelectedLocations(prev => prev.filter(locId => locId !== id));
    }
  };

  /**
   * Exports the locations data to a CSV file
   */
  const exportToCSV = () => {
    // Create CSV content
    const headers = ['Name', 'Address', 'City', 'State', 'Country', 'Postal Code', 'Status', 'Created Date'];
    const rows = filteredLocations.map(loc => [
      loc.name,
      loc.address,
      loc.city,
      loc.state,
      loc.country,
      loc.postal_code,
      loc.status,
      new Date(loc.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `locations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get unique states and cities for filters
  const states = Array.from(new Set(locations.map(loc => loc.state)));
  const cities = Array.from(new Set(locations.map(loc => loc.city)));

  // Apply filters and sorting
  const filteredLocations = locations
    .filter(location => {
      const matchesSearch = (
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = !filters.status || location.status === filters.status;
      const matchesState = !filters.state || location.state === filters.state;
      const matchesCity = !filters.city || location.city === filters.city;
      
      return matchesSearch && matchesStatus && matchesState && matchesCity;
    })
    .sort((a, b) => {
      const key = sortConfig.key;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (a[key] < b[key]) return -1 * direction;
      if (a[key] > b[key]) return 1 * direction;
      return 0;
    });

  /**
   * Gets the state name from a state code
   */
  const getStateNameByCode = (code: string) => {
    const state = US_STATES.find(s => s.code === code);
    return state ? state.name : code;
  };

  /**
   * Gets the country name from a country code
   */
  const getCountryNameByCode = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country ? country.name : code;
  };

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <X className="h-5 w-5 text-red-400" />
            <p className="ml-2 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.state}
            onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
            className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All States</option>
            {states.map(state => (
              <option key={state} value={state}>{getStateNameByCode(state)}</option>
            ))}
          </select>

          <select
            value={filters.city}
            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className={clsx(
              "p-2 text-gray-500 hover:text-gray-700 rounded-full transition-transform",
              isRefreshing && "animate-spin"
            )}
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          
          <button
            onClick={exportToCSV}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Export to CSV"
          >
            <Download className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Location
          </button>
        </div>
      </div>

      {selectedLocations.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between mb-4">
          <span className="text-sm text-blue-700">
            {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleBulkStatusChange('active')}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
            >
              Set Active
            </button>
            <button
              onClick={() => handleBulkStatusChange('inactive')}
              className="px-3 py-1 text-xs font-medium text-white bg-gray-600 rounded hover:bg-gray-700"
            >
              Set Inactive
            </button>
            <button
              onClick={() => setDeleteModalState({
                isOpen: true,
                locationId: '',
                locationName: '',
                isMultiple: true
              })}
              className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedLocations.length === filteredLocations.length && filteredLocations.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex items-center">
                    City
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('state')}
                >
                  <div className="flex items-center">
                    State
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Postal Code
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Created
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <tr key={location.id} className={selectedLocations.includes(location.id) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location.id)}
                        onChange={(e) => handleSelectLocation(location.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{location.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{location.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {location.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getStateNameByCode(location.state)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {location.postal_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        location.status === 'active' 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      )}>
                        {location.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(location.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingLocation(location)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit location"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModalState({
                            isOpen: true,
                            locationId: location.id,
                            locationName: location.name,
                            isMultiple: false
                          })}
                          className="text-red-600 hover:text-red-900"
                          title="Delete location"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    {loading ? 'Loading locations...' : 'No locations found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Location Modal */}
      <LocationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddLocation}
        title="Add New Location"
      />

      {/* Edit Location Modal */}
      <LocationModal
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        onSubmit={handleUpdateLocation}
        initialData={editingLocation || undefined}
        title="Edit Location"
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({
          isOpen: false,
          locationId: '',
          locationName: '',
          isMultiple: false
        })}
        onConfirm={handleDeleteLocation}
        locationName={deleteModalState.locationName}
        isMultiple={deleteModalState.isMultiple}
      />
    </div>
  );
};