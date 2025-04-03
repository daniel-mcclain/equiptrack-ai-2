import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EquipmentUsage } from '../types/equipment';

interface UseEquipmentUsageResult {
  usageHistory: EquipmentUsage[];
  currentUsage: EquipmentUsage | null;
  loading: boolean;
  error: string | null;
  checkOut: (data: CheckOutData) => Promise<void>;
  checkIn: (usageId: string, condition: string, notes?: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

interface CheckOutData {
  equipmentId: string;
  userId: string;
  departmentId?: string;
  purpose: string;
  expectedReturnDate?: string;
  notes?: string;
}

export const useEquipmentUsage = (
  equipmentId: string,
  isAuthenticated: boolean
): UseEquipmentUsageResult => {
  const [usageHistory, setUsageHistory] = useState<EquipmentUsage[]>([]);
  const [currentUsage, setCurrentUsage] = useState<EquipmentUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isAuthenticated || !equipmentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch current usage (checked out but not returned)
      const { data: currentData, error: currentError } = await supabase
        .from('equipment_usage')
        .select(`
          *,
          user:user_id (
            id,
            first_name,
            last_name,
            email
          ),
          department:department_id (
            id,
            name
          )
        `)
        .eq('equipment_id', equipmentId)
        .is('return_date', null)
        .order('checkout_date', { ascending: false })
        .maybeSingle();

      if (currentError) throw currentError;
      setCurrentUsage(currentData);

      // Fetch usage history (returned items)
      const { data: historyData, error: historyError } = await supabase
        .from('equipment_usage')
        .select(`
          *,
          user:user_id (
            id,
            first_name,
            last_name,
            email
          ),
          department:department_id (
            id,
            name
          )
        `)
        .eq('equipment_id', equipmentId)
        .not('return_date', 'is', null)
        .order('checkout_date', { ascending: false });

      if (historyError) throw historyError;
      setUsageHistory(historyData || []);

    } catch (err: any) {
      console.error('Error fetching equipment usage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [equipmentId, isAuthenticated]);

  const checkOut = async (data: CheckOutData) => {
    if (!isAuthenticated) {
      setError('You must be logged in to check out equipment');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if equipment is already checked out
      const { data: existingUsage, error: checkError } = await supabase
        .from('equipment_usage')
        .select('id')
        .eq('equipment_id', data.equipmentId)
        .is('return_date', null)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUsage) {
        throw new Error('This equipment is already checked out');
      }

      // Create new usage record
      const { error: insertError } = await supabase
        .from('equipment_usage')
        .insert([{
          equipment_id: data.equipmentId,
          user_id: data.userId,
          department_id: data.departmentId || null,
          checkout_date: new Date().toISOString(),
          expected_return_date: data.expectedReturnDate || null,
          purpose: data.purpose,
          notes: data.notes || null
        }]);

      if (insertError) throw insertError;

      // Update equipment status to "In Use"
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ status: 'In Use' })
        .eq('id', data.equipmentId);

      if (updateError) throw updateError;

      await fetchData();
    } catch (err: any) {
      console.error('Error checking out equipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async (usageId: string, condition: string, notes?: string) => {
    if (!isAuthenticated) {
      setError('You must be logged in to check in equipment');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Update usage record with return date and condition
      const { error: updateUsageError } = await supabase
        .from('equipment_usage')
        .update({
          return_date: new Date().toISOString(),
          condition_at_return: condition,
          notes: notes || null
        })
        .eq('id', usageId);

      if (updateUsageError) throw updateUsageError;

      // Get equipment ID from usage record
      const { data: usageData, error: usageError } = await supabase
        .from('equipment_usage')
        .select('equipment_id')
        .eq('id', usageId)
        .single();

      if (usageError) throw usageError;

      // Update equipment status based on condition
      const newStatus = condition === 'Damaged' ? 'Maintenance' : 'Available';
      const { error: updateEquipmentError } = await supabase
        .from('equipment')
        .update({ status: newStatus })
        .eq('id', usageData.equipment_id);

      if (updateEquipmentError) throw updateEquipmentError;

      await fetchData();
    } catch (err: any) {
      console.error('Error checking in equipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    usageHistory,
    currentUsage,
    loading,
    error,
    checkOut,
    checkIn,
    refreshData: fetchData
  };
};