import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VehicleFormData {
  name: string;
  type: string;
  status: string;
  manufacturer: string;
  model: string;
  year: string;
  license_plate: string | null;
  vin: string | null;
  mileage: number;
  fuel_type: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  company_id: string | null;
  groups: string[];
  tags: string[];
}

interface Setting {
  id: string;
  name: string;
  value: string;
  is_active: boolean;
}

const VEHICLE_TYPES = [
  'Truck',
  'Van',
  'Car',
  'SUV',
  'Bus',
  'Trailer',
  'Heavy Equipment',
  'Other'
];

const VEHICLE_STATUSES = [
  'Active',
  'Inactive',
  'Maintenance',
  'Out of Service'
];

const FUEL_TYPES = [
  'Gasoline',
  'Diesel',
  'Electric',
  'Hybrid',
  'Natural Gas',
  'Propane',
  'Other'
];

const SUGGESTED_TAGS = [
  'Long Haul',
  'Local Delivery',
  'Refrigerated',
  'Hazmat',
  'Express',
  'Heavy Load',
  'Special Equipment',
  'Training',
  'Backup',
  'VIP'
];

const AddVehicle = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Setting[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    type: '',
    status: 'Active',
    manufacturer: '',
    model: '',
    year: new Date().getFullYear().toString(),
    license_plate: null,
    vin: null,
    mileage: 0,
    fuel_type: null,
    last_maintenance: null,
    next_maintenance: null,
    company_id: null,
    groups: [],
    tags: []
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (!company) throw new Error('No company found');
        
        setCompanyId(company.id);
        setFormData(prev => ({ ...prev, company_id: company.id }));

        // Fetch groups from company_settings
        const { data: groupsData, error: groupsError } = await supabase
          .from('company_settings')
          .select('id, name, value, is_active')
          .eq('company_id', company.id)
          .eq('setting_type', 'group')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.message);
      }
    };

    fetchInitialData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGroupAdd = (group: string) => {
    if (group && !formData.groups.includes(group)) {
      setFormData(prev => ({
        ...prev,
        groups: [...prev.groups, group]
      }));
    }
    setNewGroup('');
  };

  const handleGroupRemove = (groupToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.filter(group => group !== groupToRemove)
    }));
  };

  const getGroupName = (value: string) => {
    const group = groups.find(g => g.value === value);
    return group ? group.name : value;
  };

  const handleTagAdd = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setNewTag('');
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      setError('No company found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('vehicles')
        .insert([{
          name: formData.name,
          type: formData.type,
          status: formData.status,
          manufacturer: formData.manufacturer,
          model: formData.model,
          year: parseInt(formData.year),
          license_plate: formData.license_plate,
          vin: formData.vin,
          mileage: formData.mileage,
          fuel_type: formData.fuel_type,
          last_maintenance: formData.last_maintenance,
          next_maintenance: formData.next_maintenance,
          company_id: formData.company_id,
          groups: formData.groups,
          tags: formData.tags,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      navigate('/app/vehicles', {
        state: { message: 'Vehicle added successfully', type: 'success' }
      });
    } catch (err: any) {
      console.error('Error adding vehicle:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/app/vehicles')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Add New Vehicle</h1>
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
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Vehicle Name
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
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Vehicle Type
                </label>
                <select
                  id="type"
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
                  Manufacturer
                </label>
                <input
                  type="text"
                  id="manufacturer"
                  name="manufacturer"
                  required
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  required
                  value={formData.model}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Year
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="vin" className="block text-sm font-medium text-gray-700">
                  VIN
                </label>
                <input
                  type="text"
                  id="vin"
                  name="vin"
                  value={formData.vin || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="license_plate" className="block text-sm font-medium text-gray-700">
                  License Plate
                </label>
                <input
                  type="text"
                  id="license_plate"
                  name="license_plate"
                  value={formData.license_plate || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
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
                  {VEHICLE_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="fuel_type" className="block text-sm font-medium text-gray-700">
                  Fuel Type
                </label>
                <select
                  id="fuel_type"
                  name="fuel_type"
                  value={formData.fuel_type || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select fuel type</option>
                  {FUEL_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">
                  Current Mileage
                </label>
                <input
                  type="number"
                  id="mileage"
                  name="mileage"
                  min="0"
                  value={formData.mileage}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="last_maintenance" className="block text-sm font-medium text-gray-700">
                  Last Maintenance
                </label>
                <input
                  type="datetime-local"
                  id="last_maintenance"
                  name="last_maintenance"
                  value={formData.last_maintenance || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="next_maintenance" className="block text-sm font-medium text-gray-700">
                  Next Maintenance
                </label>
                <input
                  type="datetime-local"
                  id="next_maintenance"
                  name="next_maintenance"
                  value={formData.next_maintenance || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Groups
              </label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {formData.groups.map(group => (
                    <span
                      key={group}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                    >
                      {getGroupName(group)}
                      <button
                        type="button"
                        onClick={() => handleGroupRemove(group)}
                        className="ml-2 inline-flex items-center"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const selectedGroup = groups.find(g => 
                          g.name.toLowerCase() === newGroup.toLowerCase() ||
                          g.value.toLowerCase() === newGroup.toLowerCase()
                        );
                        if (selectedGroup) {
                          handleGroupAdd(selectedGroup.value);
                        }
                      }
                    }}
                    placeholder="Add to group..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    list="groups"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const selectedGroup = groups.find(g => 
                        g.name.toLowerCase() === newGroup.toLowerCase() ||
                        g.value.toLowerCase() === newGroup.toLowerCase()
                      );
                      if (selectedGroup) {
                        handleGroupAdd(selectedGroup.value);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add
                  </button>
                </div>
                <datalist id="groups">
                  {groups
                    .filter(group => !formData.groups.includes(group.value))
                    .map(group => (
                      <option key={group.id} value={group.name} />
                    ))}
                </datalist>

                <div className="flex flex-wrap gap-2">
                  {groups
                    .filter(group => !formData.groups.includes(group.value))
                    .map(group => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => handleGroupAdd(group.value)}
                        className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 rounded-full hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        {group.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="ml-2 inline-flex items-center"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTagAdd(newTag);
                      }
                    }}
                    placeholder="Add a tag..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTagAdd(newTag)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagAdd(tag)}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/app/vehicles')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVehicle;