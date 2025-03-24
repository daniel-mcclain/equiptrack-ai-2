import React, { useState, useEffect } from 'react';
import { X, Clock, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { now, today, getLocalTimeZone } from '@internationalized/date';
import clsx from 'clsx';

interface Technician {
  id: string;
  user: {
    first_name: string;
    last_name: string;
  };
  hourly_rate: number;
}

interface LaborModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string;
  onLaborAdded: () => void;
}

const MINUTE_INTERVALS = [0, 15, 30, 45];

const roundToQuarterHour = (date: Date) => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
};

const calculateLaborHours = (startTime: Date, endTime: Date, breakMinutes: number) => {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const breakHours = breakMinutes / 60;
  const totalHours = Math.max(0, diffHours - breakHours);
  return Math.round(totalHours * 4) / 4; // Round to nearest 0.25
};

const formatTimeForInput = (date: Date) => {
  return date.toLocaleTimeString('en-GB', { // Use 24-hour format
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const TimeInput = ({ 
  value, 
  onChange,
  label,
  id,
  isDisabled = false
}: { 
  value: Date;
  onChange: (date: Date) => void;
  label: string;
  id: string;
  isDisabled?: boolean;
}) => {
  const [hours, setHours] = useState(value.getHours());
  const [minutes, setMinutes] = useState(Math.floor(value.getMinutes() / 15) * 15);

  const handleHourChange = (increment: number) => {
    const newHours = (hours + increment + 24) % 24;
    setHours(newHours);
    const newDate = new Date(value);
    newDate.setHours(newHours);
    onChange(newDate);
  };

  const handleMinuteChange = (increment: number) => {
    const currentIndex = MINUTE_INTERVALS.indexOf(minutes);
    const newIndex = (currentIndex + increment + MINUTE_INTERVALS.length) % MINUTE_INTERVALS.length;
    const newMinutes = MINUTE_INTERVALS[newIndex];
    setMinutes(newMinutes);
    const newDate = new Date(value);
    newDate.setMinutes(newMinutes);
    onChange(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [inputHours, inputMinutes] = e.target.value.split(':').map(Number);
    if (!isNaN(inputHours) && !isNaN(inputMinutes)) {
      const roundedMinutes = Math.round(inputMinutes / 15) * 15;
      const newDate = new Date(value);
      newDate.setHours(inputHours);
      newDate.setMinutes(roundedMinutes);
      onChange(newDate);
      setHours(inputHours);
      setMinutes(roundedMinutes);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="time"
            id={id}
            value={`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}
            onChange={handleTimeChange}
            className={clsx(
              "block w-full rounded-md border-gray-300 shadow-sm",
              "focus:border-blue-500 focus:ring-blue-500",
              "text-lg font-mono",
              "min-h-[44px]", // Mobile-friendly touch target
              isDisabled && "bg-gray-100 cursor-not-allowed"
            )}
            disabled={isDisabled}
          />
          <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => handleHourChange(1)}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isDisabled}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleHourChange(-1)}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isDisabled}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => handleMinuteChange(1)}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isDisabled}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleMinuteChange(-1)}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isDisabled}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Time is in 24-hour format. Minutes are rounded to 15-minute intervals.
      </div>
    </div>
  );
};

export const LaborModal: React.FC<LaborModalProps> = ({
  isOpen,
  onClose,
  workOrderId,
  onLaborAdded
}) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    technician_id: '',
    start_time: roundToQuarterHour(new Date()),
    end_time: null as Date | null,
    break_minutes: 0,
    is_overtime: false
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        // Get current user's company
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // Get work order to get company ID
        const { data: workOrder, error: workOrderError } = await supabase
          .from('work_orders')
          .select('company_id')
          .eq('id', workOrderId)
          .single();

        if (workOrderError) throw workOrderError;
        if (!workOrder) throw new Error('Work order not found');

        // Get technicians for the company
        const { data: techniciansData, error: techniciansError } = await supabase
          .from('technicians')
          .select(`
            id,
            user:user_id (
              first_name,
              last_name
            ),
            hourly_rate
          `)
          .eq('company_id', workOrder.company_id)
          .eq('status', 'active');

        if (techniciansError) throw techniciansError;
        setTechnicians(techniciansData || []);
      } catch (err: any) {
        console.error('Error fetching technicians:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchTechnicians();
      setError(null);
      setFormData({
        technician_id: '',
        start_time: roundToQuarterHour(new Date()),
        end_time: null,
        break_minutes: 0,
        is_overtime: false
      });
    }
  }, [isOpen, workOrderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.technician_id) {
      setError('Please select a technician');
      return;
    }
    if (!formData.start_time) {
      setError('Please enter a start time');
      return;
    }
    if (formData.end_time && formData.end_time < formData.start_time) {
      setError('End time must be after start time');
      return;
    }
    if (formData.break_minutes < 0) {
      setError('Break minutes cannot be negative');
      return;
    }
    if (formData.break_minutes % 15 !== 0) {
      setError('Break duration must be in 15-minute increments');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const technician = technicians.find(t => t.id === formData.technician_id);
      if (!technician) throw new Error('Technician not found');

      const { error: insertError } = await supabase
        .from('work_order_labor')
        .insert([{
          work_order_id: workOrderId,
          technician_id: formData.technician_id,
          start_time: formData.start_time.toISOString(),
          end_time: formData.end_time?.toISOString() || null,
          break_minutes: Math.round(formData.break_minutes / 15) * 15,
          is_overtime: formData.is_overtime,
          hourly_rate: technician.hourly_rate
        }]);

      if (insertError) throw insertError;

      onLaborAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding labor:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetNow = (field: 'start_time' | 'end_time') => {
    setFormData(prev => ({
      ...prev,
      [field]: roundToQuarterHour(new Date())
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Add Labor Entry
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                All times are rounded to the nearest 15 minutes
              </p>

              {error && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="technician_id" className="block text-sm font-medium text-gray-700">
                        Technician
                      </label>
                      <select
                        id="technician_id"
                        name="technician_id"
                        required
                        value={formData.technician_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, technician_id: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="">Select technician</option>
                        {technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>
                            {tech.user.first_name} {tech.user.last_name} (${tech.hourly_rate}/hr)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <TimeInput
                          id="start_time"
                          label="Start Time"
                          value={formData.start_time}
                          onChange={(date) => setFormData(prev => ({ ...prev, start_time: date }))}
                        />
                        <button
                          type="button"
                          onClick={() => handleSetNow('start_time')}
                          className="absolute right-0 top-0 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Set to now
                        </button>
                      </div>

                      <div className="relative">
                        <TimeInput
                          id="end_time"
                          label="End Time (Optional)"
                          value={formData.end_time || new Date()}
                          onChange={(date) => setFormData(prev => ({ ...prev, end_time: date }))}
                          isDisabled={!formData.end_time}
                        />
                        <button
                          type="button"
                          onClick={() => handleSetNow('end_time')}
                          className="absolute right-0 top-0 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Set to now
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="break_minutes" className="block text-sm font-medium text-gray-700">
                        Break Duration (minutes, in 15-minute increments)
                      </label>
                      <select
                        id="break_minutes"
                        name="break_minutes"
                        value={formData.break_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, break_minutes: parseInt(e.target.value) }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[44px]"
                      >
                        {[...Array(9)].map((_, i) => (
                          <option key={i} value={i * 15}>
                            {i * 15} minutes
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_overtime"
                        name="is_overtime"
                        checked={formData.is_overtime}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_overtime: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_overtime" className="ml-2 block text-sm text-gray-900">
                        Overtime Rate (1.5x)
                      </label>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 min-h-[44px]"
                      >
                        {submitting ? 'Adding...' : 'Add Labor'}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};