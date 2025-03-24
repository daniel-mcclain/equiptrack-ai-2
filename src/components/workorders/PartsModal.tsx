import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface Part {
  id: string;
  part_number: string;
  description: string;
  unit_cost: number;
  quantity_in_stock: number;
  manufacturer: string;
  category: string | null;
}

interface PartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string;
  onPartsAdded: () => void;
}

export const PartsModal: React.FC<PartsModalProps> = ({
  isOpen,
  onClose,
  workOrderId,
  onPartsAdded
}) => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    manufacturer: '',
    inStock: false
  });

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (!company) throw new Error('No company found');

        const { data: partsData, error: partsError } = await supabase
          .from('parts_inventory')
          .select('*')
          .eq('company_id', company.id)
          .order('part_number');

        if (partsError) throw partsError;
        setParts(partsData || []);
      } catch (err: any) {
        console.error('Error fetching parts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchParts();
      setSelectedParts({});
      setSearchTerm('');
      setFilters({
        category: '',
        manufacturer: '',
        inStock: false
      });
    }
  }, [isOpen]);

  const handleQuantityChange = (partId: string, change: number) => {
    setSelectedParts(prev => {
      const currentQty = prev[partId] || 0;
      const newQty = Math.max(0, currentQty + change);
      if (newQty === 0) {
        const { [partId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [partId]: newQty };
    });
  };

  const handleSubmit = async () => {
    try {
      const partsToAdd = Object.entries(selectedParts).map(([partId, quantity]) => {
        const part = parts.find(p => p.id === partId);
        if (!part) throw new Error('Part not found');
        return {
          work_order_id: workOrderId,
          part_id: partId,
          quantity,
          unit_cost: part.unit_cost
        };
      });

      const { error: insertError } = await supabase
        .from('work_order_parts')
        .insert(partsToAdd);

      if (insertError) throw insertError;

      onPartsAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding parts:', err);
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
    return matchesSearch && matchesCategory && matchesManufacturer && matchesStock;
  });

  const categories = Array.from(new Set(parts.map(p => p.category).filter(Boolean)));
  const manufacturers = Array.from(new Set(parts.map(p => p.manufacturer).filter(Boolean)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Add Parts
              </h3>

              {error && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="mt-4">
                {loading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Search parts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                    </div>

                    {/* Parts List */}
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
                              In Stock
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
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
                                {part.manufacturer || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {part.category || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {part.quantity_in_stock}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${part.unit_cost.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(part.id, -1)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    disabled={!selectedParts[part.id]}
                                  >
                                    <Minus className="h-5 w-5" />
                                  </button>
                                  <span className="w-8 text-center">
                                    {selectedParts[part.id] || 0}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(part.id, 1)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    disabled={selectedParts[part.id] >= part.quantity_in_stock}
                                  >
                                    <Plus className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredParts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                No parts found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary */}
                    {Object.keys(selectedParts).length > 0 && (
                      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Parts</h4>
                        <div className="space-y-2">
                          {Object.entries(selectedParts).map(([partId, quantity]) => {
                            const part = parts.find(p => p.id === partId);
                            if (!part) return null;
                            return (
                              <div key={partId} className="flex justify-between text-sm">
                                <span>{part.description}</span>
                                <span>
                                  {quantity} × ${part.unit_cost.toFixed(2)} = ${(quantity * part.unit_cost).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t border-gray-200 font-medium">
                            <div className="flex justify-between">
                              <span>Total</span>
                              <span>
                                ${Object.entries(selectedParts).reduce((sum, [partId, quantity]) => {
                                  const part = parts.find(p => p.id === partId);
                                  return sum + (part ? part.unit_cost * quantity : 0);
                                }, 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={Object.keys(selectedParts).length === 0}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                      >
                        Add Parts
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};