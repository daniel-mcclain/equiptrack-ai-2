import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface EditInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  partId: string;
}

const editPartSchema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  description: z.string().min(1, 'Description is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  category: z.string().nullable(),
  unitCost: z.string().transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val > 0, 'Unit cost must be greater than 0'),
  quantityInStock: z.string().transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 0, 'Quantity must be 0 or greater'),
  reorderPoint: z.string().transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 0, 'Reorder point must be 0 or greater')
});

type EditPartFormData = z.infer<typeof editPartSchema>;

export const EditInventoryModal: React.FC<EditInventoryModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  partId
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<EditPartFormData>({
    resolver: zodResolver(editPartSchema)
  });

  useEffect(() => {
    const fetchPartDetails = async () => {
      if (!isOpen || !partId) return;

      try {
        setLoading(true);
        setError(null);

        const { data: part, error: partError } = await supabase
          .from('parts_inventory')
          .select('*')
          .eq('id', partId)
          .single();

        if (partError) throw partError;

        reset({
          partNumber: part.part_number,
          description: part.description,
          manufacturer: part.manufacturer,
          category: part.category,
          unitCost: part.unit_cost.toString(),
          quantityInStock: part.quantity_in_stock.toString(),
          reorderPoint: part.reorder_point.toString()
        });
      } catch (err: any) {
        console.error('Error fetching part details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPartDetails();
  }, [isOpen, partId, reset]);

  const onSubmit = async (data: EditPartFormData) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('parts_inventory')
        .update({
          part_number: data.partNumber,
          description: data.description,
          manufacturer: data.manufacturer,
          category: data.category,
          unit_cost: data.unitCost,
          quantity_in_stock: data.quantityInStock,
          reorder_point: data.reorderPoint,
          updated_at: new Date().toISOString()
        })
        .eq('id', partId);

      if (updateError) throw updateError;

      setSuccess(true);
      onUpdate();

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Error updating part:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
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
                Edit Part
              </h3>

              {error && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <p className="ml-2 text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-400" />
                    <p className="ml-2 text-sm text-green-600">
                      Part updated successfully!
                    </p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="partNumber" className="block text-sm font-medium text-gray-700">
                      Part Number
                    </label>
                    <input
                      type="text"
                      {...register('partNumber')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.partNumber ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.partNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.partNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <input
                      type="text"
                      {...register('description')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.description ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      {...register('manufacturer')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.manufacturer ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.manufacturer && (
                      <p className="mt-1 text-sm text-red-600">{errors.manufacturer.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      type="text"
                      {...register('category')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700">
                      Unit Cost
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('unitCost')}
                        className={clsx(
                          "pl-7 block w-full rounded-md shadow-sm",
                          "focus:border-blue-500 focus:ring-blue-500",
                          errors.unitCost ? "border-red-300" : "border-gray-300"
                        )}
                      />
                    </div>
                    {errors.unitCost && (
                      <p className="mt-1 text-sm text-red-600">{errors.unitCost.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quantityInStock" className="block text-sm font-medium text-gray-700">
                      Quantity in Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('quantityInStock')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.quantityInStock ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.quantityInStock && (
                      <p className="mt-1 text-sm text-red-600">{errors.quantityInStock.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('reorderPoint')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.reorderPoint ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.reorderPoint && (
                      <p className="mt-1 text-sm text-red-600">{errors.reorderPoint.message}</p>
                    )}
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};