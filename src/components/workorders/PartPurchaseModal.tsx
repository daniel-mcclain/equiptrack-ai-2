import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, Upload, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface PartPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseAdded: () => void;
  companyId: string;
}

const partPurchaseSchema = z.object({
  name: z.string().min(1, 'Part name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  purchasePrice: z.string().transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val > 0, 'Price must be greater than 0'),
  quantity: z.string().transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, 'Quantity must be greater than 0'),
  unitOfMeasurement: z.string().min(1, 'Unit of measurement is required'),
  orderNumber: z.string().min(1, 'Order number is required'),
  deliveryStatus: z.enum(['pending', 'in_transit', 'delivered', 'delayed']),
  expectedDeliveryDate: z.string().optional(),
  storageLocation: z.string().min(1, 'Storage location is required'),
  minimumStock: z.string().transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 0, 'Minimum stock must be 0 or greater'),
  currentStock: z.string().transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 0, 'Current stock must be 0 or greater'),
  qualityNotes: z.string().optional(),
  warrantyInfo: z.string().optional()
});

type PartPurchaseFormData = z.infer<typeof partPurchaseSchema>;

const DELIVERY_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' }
];

const UNITS_OF_MEASUREMENT = [
  'Each',
  'Pair',
  'Set',
  'Box',
  'Case',
  'Pack',
  'Roll',
  'Meter',
  'Foot',
  'Kilogram',
  'Pound'
];

export const PartPurchaseModal: React.FC<PartPurchaseModalProps> = ({
  isOpen,
  onClose,
  onPurchaseAdded,
  companyId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PartPurchaseFormData>({
    resolver: zodResolver(partPurchaseSchema),
    defaultValues: {
      deliveryStatus: 'pending',
      minimumStock: '0',
      currentStock: '0'
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PartPurchaseFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Upload attachments first
      const attachmentUrls = await Promise.all(
        attachments.map(async file => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `parts-purchases/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          return publicUrl;
        })
      );

      // Create part in inventory if it doesn't exist
      const { data: existingPart, error: partCheckError } = await supabase
        .from('parts_inventory')
        .select('id')
        .eq('company_id', companyId)
        .eq('part_number', data.partNumber)
        .single();

      let partId: string;

      if (!existingPart) {
        const { data: newPart, error: createPartError } = await supabase
          .from('parts_inventory')
          .insert([{
            company_id: companyId,
            part_number: data.partNumber,
            description: data.name,
            unit_cost: data.purchasePrice,
            quantity_in_stock: data.currentStock,
            reorder_point: data.minimumStock,
            category: null,
            manufacturer: data.manufacturer
          }])
          .select()
          .single();

        if (createPartError) throw createPartError;
        partId = newPart.id;
      } else {
        partId = existingPart.id;

        // Update existing part
        const { error: updatePartError } = await supabase
          .from('parts_inventory')
          .update({
            unit_cost: data.purchasePrice,
            quantity_in_stock: data.currentStock,
            reorder_point: data.minimumStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', partId);

        if (updatePartError) throw updatePartError;
      }

      // Create purchase record
      const { error: purchaseError } = await supabase
        .from('part_purchases')
        .insert([{
          company_id: companyId,
          part_id: partId,
          supplier: data.supplier,
          purchase_date: data.purchaseDate,
          purchase_price: data.purchasePrice,
          quantity: data.quantity,
          unit_of_measurement: data.unitOfMeasurement,
          order_number: data.orderNumber,
          delivery_status: data.deliveryStatus,
          expected_delivery_date: data.expectedDeliveryDate || null,
          storage_location: data.storageLocation,
          quality_notes: data.qualityNotes || null,
          warranty_info: data.warrantyInfo || null,
          attachments: attachmentUrls
        }]);

      if (purchaseError) throw purchaseError;

      setSuccess(true);
      reset();
      setAttachments([]);
      onPurchaseAdded();

      // Close modal after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Error creating part purchase:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
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
                Add Part Purchase
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
                      Part purchase added successfully!
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Part Name/Description
                    </label>
                    <input
                      type="text"
                      {...register('name')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.name ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="partNumber" className="block text-sm font-medium text-gray-700">
                      Part Number/SKU
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
                    <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
                      Manufacturer/Brand
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
                    <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
                      Supplier/Vendor
                    </label>
                    <input
                      type="text"
                      {...register('supplier')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.supplier ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.supplier && (
                      <p className="mt-1 text-sm text-red-600">{errors.supplier.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      {...register('purchaseDate')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.purchaseDate ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.purchaseDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.purchaseDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">
                      Purchase Price (per unit)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('purchasePrice')}
                        className={clsx(
                          "pl-7 block w-full rounded-md shadow-sm",
                          "focus:border-blue-500 focus:ring-blue-500",
                          errors.purchasePrice ? "border-red-300" : "border-gray-300"
                        )}
                      />
                    </div>
                    {errors.purchasePrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.purchasePrice.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                      Quantity Purchased
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register('quantity')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.quantity ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.quantity && (
                      <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="unitOfMeasurement" className="block text-sm font-medium text-gray-700">
                      Unit of Measurement
                    </label>
                    <select
                      {...register('unitOfMeasurement')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.unitOfMeasurement ? "border-red-300" : "border-gray-300"
                      )}
                    >
                      <option value="">Select unit</option>
                      {UNITS_OF_MEASUREMENT.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    {errors.unitOfMeasurement && (
                      <p className="mt-1 text-sm text-red-600">{errors.unitOfMeasurement.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700">
                      Order/Invoice Number
                    </label>
                    <input
                      type="text"
                      {...register('orderNumber')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.orderNumber ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.orderNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.orderNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="deliveryStatus" className="block text-sm font-medium text-gray-700">
                      Delivery Status
                    </label>
                    <select
                      {...register('deliveryStatus')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.deliveryStatus ? "border-red-300" : "border-gray-300"
                      )}
                    >
                      {DELIVERY_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    {errors.deliveryStatus && (
                      <p className="mt-1 text-sm text-red-600">{errors.deliveryStatus.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      {...register('expectedDeliveryDate')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="storageLocation" className="block text-sm font-medium text-gray-700">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      {...register('storageLocation')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.storageLocation ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.storageLocation && (
                      <p className="mt-1 text-sm text-red-600">{errors.storageLocation.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="minimumStock" className="block text-sm font-medium text-gray-700">
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('minimumStock')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.minimumStock ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.minimumStock && (
                      <p className="mt-1 text-sm text-red-600">{errors.minimumStock.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700">
                      Current Stock Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...register('currentStock')}
                      className={clsx(
                        "mt-1 block w-full rounded-md shadow-sm",
                        "focus:border-blue-500 focus:ring-blue-500",
                        errors.currentStock ? "border-red-300" : "border-gray-300"
                      )}
                    />
                    {errors.currentStock && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentStock.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="qualityNotes" className="block text-sm font-medium text-gray-700">
                    Quality/Condition Notes
                  </label>
                  <textarea
                    {...register('qualityNotes')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="warrantyInfo" className="block text-sm font-medium text-gray-700">
                    Warranty/Return Information
                  </label>
                  <textarea
                    {...register('warrantyInfo')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Attachments
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload files</span>
                          <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF, PNG, JPG up to 10MB each
                      </p>
                    </div>
                  </div>
                  {attachments.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {attachments.map((file, index) => (
                        <li key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Purchase'}
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