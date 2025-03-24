import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, AlertCircle, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface PartsTrackerProps {
  workOrderId: string;
  onUpdate: () => void;
  onAddParts: () => void;
}

interface Part {
  id: string;
  part_number: string;
  description: string;
  unit_cost: number;
  quantity_in_stock: number;
}

interface PartEntry {
  id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  part: Part;
}

const LOCAL_STORAGE_KEY = 'partsTrackerExpanded';

const PartsSummary = ({ entries }: { entries: PartEntry[] }) => {
  const totalParts = entries.length;
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalCost = entries.reduce((sum, entry) => sum + entry.total_cost, 0);

  return (
    <div className="flex items-center space-x-6 text-sm">
      <div>
        <span className="text-gray-500">Parts:</span>{' '}
        <span className="font-medium text-gray-900">{totalParts}</span>
      </div>
      <div>
        <span className="text-gray-500">Total Quantity:</span>{' '}
        <span className="font-medium text-gray-900">{totalQuantity}</span>
      </div>
      <div>
        <span className="text-gray-500">Total Cost:</span>{' '}
        <span className="font-medium text-gray-900">${totalCost.toFixed(2)}</span>
      </div>
    </div>
  );
};

export const PartsTracker: React.FC<PartsTrackerProps> = ({
  workOrderId,
  onUpdate,
  onAddParts
}) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partEntries, setPartEntries] = useState<PartEntry[]>([]);
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

      const { data: entries, error: entriesError } = await supabase
        .from('work_order_parts')
        .select(`
          id,
          part_id,
          quantity,
          unit_cost,
          total_cost,
          part:parts_inventory (
            id,
            part_number,
            description,
            unit_cost,
            quantity_in_stock
          )
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;
      setPartEntries(entries || []);

    } catch (err: any) {
      console.error('Error fetching parts data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const subscription = supabase
        .channel('parts-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'work_order_parts',
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
            <span className="font-medium">Parts</span>
          </button>
          {!isExpanded && <PartsSummary entries={partEntries} />}
        </div>
        <div className="flex items-center space-x-2">
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
          <button
            onClick={onAddParts}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Parts
          </button>
        </div>
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

            <div className="bg-white rounded-lg shadow-sm">
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
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {partEntries.map(entry => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.part.part_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {entry.part.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${entry.unit_cost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${entry.total_cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {partEntries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No parts added yet
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