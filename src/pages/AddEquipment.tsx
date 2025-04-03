import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface EquipmentFormData {
  name: string;
  type: string;
  status: string;
  manufacturer: string;
  model: string;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  location: string | null;
  technical_specs: Record<string, any> | null;
  operating_requirements: string[] | null;
  safety_guidelines: string[] | null;
  required_certifications: string[] | null;
  notes: string | null;
}

const EQUIPMENT_TYPES = [
  'Forklift',
  'Pallet Jack',
  'Lift',
  'Generator',
  'Compressor',
  'Pressure Washer',
  'Welder',
  'Drill',
  'Saw',
  'Cleaning Equipment',
  'Other'
];

const EQUIPMENT_STATUSES = [
  'Available',
  'In Use',
  'Maintenance',
  'Out of Service',
  'Inactive'
];

const LOCATIONS = [
  'Warehouse A',
  'Warehouse B',
  'Maintenance Shop',
  'Loading Dock',
  'Field Site',
  'Office',
  'Other'
];

const AddEquipment = () => {
  const navigate = useNavigate();
  const { isAuthenticated, effectiveCompanyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRequirement, setNewRequirement] = useState('');
  const [newGuideline, setNewGuideline] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [technicalSpecs, setTechnicalSpecs] = useState<{key: string, value: string}[]>([
    { key: '', value: '' }
  ]);
  
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    type: '',
    status: 'Available',
    manufacturer: '',
    model: '',
    serial_number: null,
    purchase_date: null,
    warranty_expiry: null,
    location: null,
    technical_specs: null,
    operating_requirements: [],
    safety_guidelines: [],
    required_certifications: [],
    notes: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTechnicalSpecChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedSpecs = [...technicalSpecs];
    updatedSpecs[index][field] = value;
    setTechnicalSpecs(updatedSpecs);
  };

  const addTechnicalSpec = () => {
    setTechnicalSpecs([...technicalSpecs, { key: '', value: '' }]);
  };

  const removeTechnicalSpec = (index: number) => {
    const updatedSpecs = [...technicalSpecs];
    updatedSpecs.splice(index, 1);
    setTechnicalSpecs(updatedSpecs);
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        operating_requirements: [...(prev.operating_requirements || []), newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      operating_requirements: prev.operating_requirements?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddGuideline = () => {
    if (newGuideline.trim()) {
      setFormData(prev => ({
        ...prev,
        safety_guidelines: [...(prev.safety_guidelines || []), newGuideline.trim()]
      }));
      setNewGuideline('');
    }
  };

  const handleRemoveGuideline = (index: number) => {
    setFormData(prev => ({
      ...prev,
      safety_guidelines: prev.safety_guidelines?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        required_certifications: [...(prev.required_certifications || []), newCertification.trim()]
      }));
      setNewCertification('');
    }
  };

  const handleRemoveCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      required_certifications: prev.required_certifications?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Please sign in to add equipment');
      return;
    }

    if (!effectiveCompanyId) {
      setError('No company found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert technical specs array to object
      const technicalSpecsObject = technicalSpecs.reduce((acc, { key, value }) => {
        if (key.trim() && value.trim()) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {} as Record<string, string>);

      const { data, error: insertError } = await supabase
        .from('equipment')
        .insert([{
          name: formData.name,
          type: formData.type,
          status: formData.status,
          manufacturer: formData.manufacturer,
          model: formData.model,
          serial_number: formData.serial_number,
          purchase_date: formData.purchase_date,
          warranty_expiry: formData.warranty_expiry,
          location: formData.location,
          technical_specs: Object.keys(technicalSpecsObject).length > 0 ? technicalSpecsObject : null,
          operating_requirements: formData.operating_requirements?.length ? formData.operating_requirements : null,
          safety_guidelines: formData.safety_guidelines?.length ? formData.safety_guidelines : null,
          required_certifications: formData.required_certifications?.length ? formData.required_certifications : null,
          notes: formData.notes,
          company_id: effectiveCompanyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      navigate('/app/equipment', {
        state: { message: 'Equipment added successfully', type: 'success' }
      });
    } catch (err: any) {
      console.error('Error adding equipment:', err);
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
            onClick={() => navigate('/app/equipment')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Add New Equipment</h1>
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
                  Equipment Name
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
                  Equipment Type
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
                  {EQUIPMENT_TYPES.map(type => (
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
                <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700">
                  Serial Number
                </label>
                <input
                  type="text"
                  id="serial_number"
                  name="serial_number"
                  value={formData.serial_number || ''}
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
                  {EQUIPMENT_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
                  Purchase Date
                </label>
                <input
                  type="date"
                  id="purchase_date"
                  name="purchase_date"
                  value={formData.purchase_date || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="warranty_expiry" className="block text-sm font-medium text-gray-700">
                  Warranty Expiry
                </label>
                <input
                  type="date"
                  id="warranty_expiry"
                  name="warranty_expiry"
                  value={formData.warranty_expiry || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select location</option>
                  {LOCATIONS.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technical Specifications
              </label>
              <div className="space-y-3">
                {technicalSpecs.map((spec, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Specification"
                      value={spec.key}
                      onChange={(e) => handleTechnicalSpecChange(index, 'key', e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={spec.value}
                      onChange={(e) => handleTechnicalSpecChange(index, 'value', e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeTechnicalSpec(index)}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTechnicalSpec}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Add Specification
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operating Requirements
              </label>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add requirement..."
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-2">
                  {formData.operating_requirements?.map((req, index) => (
                    <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span>{req}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Safety Guidelines
              </label>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add safety guideline..."
                    value={newGuideline}
                    onChange={(e) => setNewGuideline(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddGuideline}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-2">
                  {formData.safety_guidelines?.map((guideline, index) => (
                    <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span>{guideline}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuideline(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Certifications
              </label>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add certification..."
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCertification}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-2">
                  {formData.required_certifications?.map((cert, index) => (
                    <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span>{cert}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertification(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/app/equipment')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Equipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEquipment;