import React, { useState } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useInventory } from '../hooks/useInventory';
import { PartPurchaseModal } from '../components/workorders/PartPurchaseModal';
import { EditInventoryModal } from '../components/inventory/EditInventoryModal';

interface Part {
  id: string;
  part_number: string;
  description: string;
  manufacturer: string;
  category: string | null;
  unit_cost: number;
  quantity_in_stock: number;
  reorder_point: number;
}

const Inventory = () => {
  const { isAuthenticated, isLoading, selectedCompanyId } = useAuth();
  const { parts, loading, error, companyId, refreshData } = useInventory(
    isAuthenticated,
    isLoading,
    selectedCompanyId
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    manufacturer: '',
    inStock: false,
    belowReorder: false
  });

  const handleAddPart = () => {
    if (!isAuthenticated) {
      setError('Please sign in to add parts');
      return;
    }
    setShowAddModal(true);
  };

  const handleEditPart = (partId: string) => {
    if (!isAuthenticated) {
      setError('Please sign in to edit parts');
      return;
    }
    setSelectedPartId(partId);
    setShowEditModal(true);
  };

  const handleDeletePart = async (partId: string) => {
    if (!isAuthenticated) {
      setError('Please sign in to delete parts');
      return;
    }

    if (!confirm('Are you sure you want to delete this part?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('parts_inventory')
        .delete()
        .eq('id', partId);

      if (deleteError) throw deleteError;

      await refreshData();
    } catch (err: any) {
      console.error('Error deleting part:', err);
      setError(err.message);
    }
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = (
      part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (part.manufacturer && part.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const matchesCategory = !filters.category || part.category === filters.category;
    const matchesManufacturer = !filters.manufacturer || part.manufacturer === filters.manufacturer;
    const matchesStock = !filters.inStock || part.quantity_in_stock > 0;
    const matchesReorder = !filters.belowReorder || part.quantity_in_stock <= part.reorder_point;
    return matchesSearch && matchesCategory && matchesManufacturer && matchesStock && matchesReorder;
  });

  const categories = Array.from(new Set(parts.map(p => p.category).filter(Boolean)));
  const manufacturers = Array.from(new Set(parts.map(p => p.manufacturer).filter(Boolean)));

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
            👋 Welcome to the demo! You're viewing sample inventory data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your inventory.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button
          onClick={handleAddPart}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Part
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-2 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={filters.manufacturer}
                onChange={(e) => setFilters(prev => ({ ...prev, manufacturer: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Manufacturers</option>
                {manufacturers.map(manufacturer => (
                  <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                ))}
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">In Stock Only</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.belowReorder}
                  onChange={(e) => setFilters(prev => ({ ...prev, belowReorder: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Below Reorder Point</span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    In Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.map(part => (
                  <tr key={part.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {part.part_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {part.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.manufacturer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${part.unit_cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        part.quantity_in_stock <= part.reorder_point
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {part.quantity_in_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.reorder_point}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditPart(part.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePart(part.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredParts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No parts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {companyId && (
        <>
          <PartPurchaseModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onPurchaseAdded={refreshData}
            companyId={companyId}
          />
          {selectedPartId && (
            <EditInventoryModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setSelectedPartId(null);
              }}
              onUpdate={refreshData}
              partId={selectedPartId}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Inventory;