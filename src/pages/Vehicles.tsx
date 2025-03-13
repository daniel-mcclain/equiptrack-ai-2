import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  Check, 
  X,
  Edit2,
  Trash2,
  Ban,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import VehicleActionModal from '../components/VehicleActionModal';
import { useAuth } from '../hooks/useAuth';
import { DEMO_VEHICLES, DEMO_COMPANY } from '../data/demoData';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import clsx from 'clsx';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  status: string;
  manufacturer: string;
  model: string;
  year: number;
  license_plate: string | null;
  mileage: number;
  groups: string[];
  tags: string[];
}

interface Setting {
  id: string;
  name: string;
  value: string;
  is_active: boolean;
}

interface Settings {
  vehicle_types: Setting[];
  statuses: Setting[];
  tags: Setting[];
  groups: Setting[];
}

interface ModalState {
  isOpen: boolean;
  vehicleId: string | null;
  vehicleName: string;
}

const DEMO_SETTINGS: Settings = {
  vehicle_types: [
    { id: 'truck', name: 'Truck', value: 'Truck', is_active: true },
    { id: 'van', name: 'Van', value: 'Van', is_active: true },
    { id: 'car', name: 'Car', value: 'Car', is_active: true },
    { id: 'trailer', name: 'Trailer', value: 'Trailer', is_active: true }
  ],
  statuses: [
    { id: 'active', name: 'Active', value: 'Active', is_active: true },
    { id: 'maintenance', name: 'Maintenance', value: 'Maintenance', is_active: true },
    { id: 'inactive', name: 'Inactive', value: 'Inactive', is_active: true },
    { id: 'out-of-service', name: 'Out of Service', value: 'Out of Service', is_active: true }
  ],
  tags: [
    { id: 'express', name: 'Express', value: 'Express', is_active: true },
    { id: 'heavy-load', name: 'Heavy Load', value: 'Heavy Load', is_active: true },
    { id: 'refrigerated', name: 'Refrigerated', value: 'Refrigerated', is_active: true },
    { id: 'local-delivery', name: 'Local Delivery', value: 'Local Delivery', is_active: true }
  ],
  groups: [
    { id: 'long_haul', name: 'Long Haul', value: 'long_haul', is_active: true },
    { id: 'local_delivery', name: 'Local Delivery', value: 'local_delivery', is_active: true },
    { id: 'refrigerated', name: 'Refrigerated', value: 'refrigerated', is_active: true }
  ]
};

const columnHelper = createColumnHelper<Vehicle>();

const Vehicles = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEMO_VEHICLES);
  const [settings, setSettings] = useState<Settings>(DEMO_SETTINGS);
  const [totalVehicles, setTotalVehicles] = useState(DEMO_VEHICLES.length);
  const [maxVehicles, setMaxVehicles] = useState(DEMO_COMPANY.max_vehicles);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type: '',
    status: '',
    tag: '',
    group: ''
  });

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

  const getSettingName = (type: keyof Settings, value: string) => {
    const setting = settings[type].find(s => s.value === value);
    return setting ? setting.name : value;
  };

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

      setVehicles(prev =>
        prev.map(v =>
          v.id === disableModal.vehicleId ? { ...v, status: 'Inactive' } : v
        )
      );

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

      setVehicles(prev => prev.filter(v => v.id !== deleteModal.vehicleId));
      setTotalVehicles(prev => prev - 1);
      setDeleteModal({ isOpen: false, vehicleId: null, vehicleName: '' });
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      setError(err.message);
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => (
        <div className="flex items-center">
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: info => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const status = info.getValue();
        const getStatusColor = (status: string) => {
          switch (status.toLowerCase()) {
            case 'active':
              return 'bg-green-100 text-green-800';
            case 'inactive':
              return 'bg-gray-100 text-gray-800';
            case 'maintenance':
              return 'bg-yellow-100 text-yellow-800';
            case 'out of service':
              return 'bg-red-100 text-red-800';
            default:
              return 'bg-gray-100 text-gray-800';
          }
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor(row => `${row.manufacturer} ${row.model}`, {
      id: 'vehicle',
      header: 'Vehicle',
      cell: info => (
        <div>
          <div className="font-medium text-gray-900">{info.getValue()}</div>
          <div className="text-sm text-gray-500">{info.row.original.year}</div>
        </div>
      ),
    }),
    columnHelper.accessor('license_plate', {
      header: 'License Plate',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('mileage', {
      header: 'Mileage',
      cell: info => info.getValue().toLocaleString(),
    }),
    columnHelper.accessor('groups', {
      header: 'Groups',
      cell: info => (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map(group => (
            <span
              key={group}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
            >
              {getSettingName('groups', group)}
            </span>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      cell: info => (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor('id', {
      header: 'Actions',
      cell: info => {
        const vehicle = info.row.original;
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEditVehicle(vehicle.id)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
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
                "p-1 transition-colors",
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
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete vehicle"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: vehicles,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, max_vehicles')
          .eq('owner_id', user.id)
          .single();

        if (companyError) throw companyError;
        if (!company) throw new Error('No company found');

        setCompanyId(company.id);
        setMaxVehicles(company.max_vehicles);

        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_id', company.id)
          .eq('is_active', true);

        if (settingsError) throw settingsError;

        const groupedSettings = settingsData.reduce((acc: Settings, setting) => {
          switch (setting.setting_type) {
            case 'vehicle_type':
              acc.vehicle_types.push(setting);
              break;
            case 'status':
              acc.statuses.push(setting);
              break;
            case 'tag':
              acc.tags.push(setting);
              break;
            case 'group':
              acc.groups.push(setting);
              break;
          }
          return acc;
        }, { vehicle_types: [], statuses: [], tags: [], groups: [] });

        setSettings(groupedSettings);

        // Fetch vehicles (excluding deleted ones)
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('company_id', company.id)
          .neq('status', 'Deleted');

        if (vehiclesError) throw vehiclesError;
        setVehicles(vehiclesData || []);
        setTotalVehicles(vehiclesData?.length || 0);

      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      fetchData();
    }
  }, [isAuthenticated, isLoading]);

  const handleAddVehicle = () => {
    if (!isAuthenticated) {
      setError('Please sign in to add vehicles');
      return;
    }

    if (!companyId) {
      setError('No company found');
      return;
    }

    if (totalVehicles >= maxVehicles) {
      setError('Vehicle limit reached for your subscription tier');
      return;
    }

    navigate('/app/vehicles/add');
  };

  const handleFilterChange = (type: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({ ...prev, [type]: value }));
  };

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
            👋 Welcome to the demo! You're viewing sample vehicle data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your own fleet.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <button
          onClick={handleAddVehicle}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              
              <div className="flex items-center space-x-2">
                <select
                  value={selectedFilters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {settings.vehicle_types.map(type => (
                    <option key={type.id} value={type.value}>{type.name}</option>
                  ))}
                </select>

                <select
                  value={selectedFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  {settings.statuses.map(status => (
                    <option key={status.id} value={status.value}>{status.name}</option>
                  ))}
                </select>

                <select
                  value={selectedFilters.group}
                  onChange={(e) => handleFilterChange('group', e.target.value)}
                  className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Groups</option>
                  {settings.groups.map(group => (
                    <option key={group.id} value={group.value}>{group.name}</option>
                  ))}
                </select>

                <select
                  value={selectedFilters.tag}
                  onChange={(e) => handleFilterChange('tag', e.target.value)}
                  className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Tags</option>
                  {settings.tags.map(tag => (
                    <option key={tag.id} value={tag.value}>{tag.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {totalVehicles} of {maxVehicles} vehicles
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  className={clsx(
                                    'flex items-center gap-2',
                                    header.column.getCanSort() && 'cursor-pointer select-none'
                                  )}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {{
                                    asc: '🔼',
                                    desc: '🔽',
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {table.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td
                              key={cell.id}
                              className="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="border rounded p-1"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </button>
              <button
                className="border rounded p-1"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </button>
              <button
                className="border rounded p-1"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </button>
              <button
                className="border rounded p-1"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </button>
              <span className="flex items-center gap-1">
                <div>Page</div>
                <strong>
                  {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </strong>
              </span>
            </div>
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value));
              }}
              className="border rounded p-1"
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
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