import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, X, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface LaborTrackerProps {
  workOrderId: string;
  onUpdate: () => void;
}

interface ActiveTimer {
  id: string;
  technician_id: string;
  start_time: string;
  technician_name: string;
  hourly_rate: number;
  is_overtime: boolean;
}

interface LaborEntry {
  id: string;
  technician_id: string;
  start_time: string;
  end_time: string | null;
  break_minutes: number;
  total_hours: number;
  total_cost: number;
  is_overtime: boolean;
  technician: {
    user: {
      first_name: string;
      last_name: string;
    };
    hourly_rate: number;
  };
}

const LOCAL_STORAGE_KEY = 'laborTrackerExpanded';

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

const LaborSummary = ({ entries }: { entries: LaborEntry[] }) => {
  const totalEntries = entries.length;
  const totalHours = entries.reduce((sum, entry) => sum + entry.total_hours, 0);
  const totalCost = entries.reduce((sum, entry) => sum + entry.total_cost, 0);

  return (
    <div className="flex items-center space-x-6 text-sm">
      <div>
        <span className="text-gray-500">Entries:</span>{' '}
        <span className="font-medium text-gray-900">{totalEntries}</span>
      </div>
      <div>
        <span className="text-gray-500">Total Hours:</span>{' '}
        <span className="font-medium text-gray-900">{totalHours.toFixed(2)}</span>
      </div>
      <div>
        <span className="text-gray-500">Total Cost:</span>{' '}
        <span className="font-medium text-gray-900">${totalCost.toFixed(2)}</span>
      </div>
    </div>
  );
};

export const LaborTracker: React.FC<LaborTrackerProps> = ({ workOrderId, onUpdate }) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<any[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : true;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: workOrder, error: workOrderError } = await supabase
        .from('work_orders')
        .select('company_id')
        .eq('id', workOrderId)
        .single();

      if (workOrderError) throw workOrderError;
      if (!workOrder) throw new Error('Work order not found');

      const { data: technicians, error: techniciansError } = await supabase
        .from('technicians')
        .select(`
          id,
          user:user_id (
            first_name,
            last_name
          ),
          hourly_rate,
          status
        `)
        .eq('company_id', workOrder.company_id)
        .eq('status', 'active');

      if (techniciansError) throw techniciansError;

      const { data: activeEntries, error: activeError } = await supabase
        .from('work_order_labor')
        .select(`
          id,
          technician_id,
          start_time,
          technician:technicians (
            user:user_id (
              first_name,
              last_name
            ),
            hourly_rate
          )
        `)
        .eq('work_order_id', workOrderId)
        .is('end_time', null);

      if (activeError) throw activeError;

      const { data: completedEntries, error: completedError } = await supabase
        .from('work_order_labor')
        .select(`
          id,
          technician_id,
          start_time,
          end_time,
          break_minutes,
          total_hours,
          total_cost,
          is_overtime,
          technician:technicians (
            user:user_id (
              first_name,
              last_name
            ),
            hourly_rate
          )
        `)
        .eq('work_order_id', workOrderId)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false });

      if (completedError) throw completedError;

      setAvailableTechnicians(technicians || []);
      setActiveTimers(activeEntries?.map(entry => ({
        id: entry.id,
        technician_id: entry.technician_id,
        start_time: entry.start_time,
        technician_name: `${entry.technician.user.first_name} ${entry.technician.user.last_name}`,
        hourly_rate: entry.technician.hourly_rate,
        is_overtime: false
      })) || []);
      setLaborEntries(completedEntries || []);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const subscription = supabase
        .channel('labor-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'work_order_labor',
          filter: `work_order_id=eq.${workOrderId}`
        }, () => {
          refreshData();
          onUpdate();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isAuthenticated, workOrderId, onUpdate]);

  const startTimer = async () => {
    if (!selectedTechnician) {
      setError('Please select a technician');
      return;
    }

    try {
      const technician = availableTechnicians.find(t => t.id === selectedTechnician);
      if (!technician) throw new Error('Technician not found');

      const hasActiveTimer = activeTimers.some(timer => timer.technician_id === selectedTechnician);
      if (hasActiveTimer) {
        throw new Error('Technician already has an active timer');
      }

      const { error: insertError } = await supabase
        .from('work_order_labor')
        .insert([{
          work_order_id: workOrderId,
          technician_id: selectedTechnician,
          start_time: new Date().toISOString(),
          hourly_rate: technician.hourly_rate
        }]);

      if (insertError) throw insertError;

      setSelectedTechnician('');
      setError(null);
    } catch (err: any) {
      console.error('Error starting timer:', err);
      setError(err.message);
    }
  };

  const stopTimer = async (timerId: string) => {
    try {
      const timer = activeTimers.find(t => t.id === timerId);
      if (!timer) throw new Error('Timer not found');

      const startTime = new Date(timer.start_time);
      const endTime = roundToQuarterHour(new Date());
      const totalHours = calculateLaborHours(startTime, endTime, 0);

      const { error: updateError } = await supabase
        .from('work_order_labor')
        .update({
          end_time: endTime.toISOString(),
          total_hours: totalHours,
          total_cost: totalHours * (timer.is_overtime ? timer.hourly_rate * 1.5 : timer.hourly_rate)
        })
        .eq('id', timerId);

      if (updateError) throw updateError;

      // Refresh data after stopping timer
      await refreshData();
      onUpdate();
    } catch (err: any) {
      console.error('Error stopping timer:', err);
      setError(err.message);
    }
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) {
      const duration = new Date().getTime() - new Date(startTime).getTime();
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleExpanded}
            className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 mr-2" />
            ) : (
              <ChevronDown className="h-5 w-5 mr-2" />
            )}
            <span className="font-medium">Labor Tracking</span>
          </button>
          {!isExpanded && <LaborSummary entries={laborEntries} />}
        </div>
        <button
          onClick={refreshData}
          className={clsx(
            "p-2 text-gray-500 hover:text-gray-700 rounded-full transition-transform",
            isRefreshing && "animate-spin"
          )}
          title="Refresh data"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Timers</h3>
              
              <div className="flex items-center space-x-4 mb-6">
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select technician</option>
                  {availableTechnicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.user.first_name} {tech.user.last_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={startTimer}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Timer
                </button>
              </div>

              <div className="space-y-4">
                {activeTimers.map(timer => (
                  <div
                    key={timer.id}
                    className="flex items-center justify-between bg-blue-50 p-4 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-blue-900">{timer.technician_name}</p>
                      <p className="text-sm text-blue-700">
                        Started at {formatDateTime(timer.start_time)}
                      </p>
                      <p className="text-sm text-blue-700">
                        Duration: {formatDuration(timer.start_time, null)}
                      </p>
                    </div>
                    <button
                      onClick={() => stopTimer(timer.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Pause className="h-5 w-5 mr-2" />
                      Stop
                    </button>
                  </div>
                ))}
                {activeTimers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No active timers</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Labor History</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Technician
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Break
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {laborEntries.map(entry => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.technician.user.first_name} {entry.technician.user.last_name}
                          </div>
                          {entry.is_overtime && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Overtime
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(entry.start_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.end_time ? formatDateTime(entry.end_time) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.total_hours.toFixed(2)} hours
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.break_minutes} minutes
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${entry.total_cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {laborEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No labor entries found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};