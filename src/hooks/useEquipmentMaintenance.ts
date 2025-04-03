import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MaintenanceRecord } from '../types/equipment';

interface UseEquipmentMaintenanceResult {
  maintenanceRecords: MaintenanceRecord[];
  loading: boolean;
  error: string | null;
  addMaintenanceRecord: (data: MaintenanceFormData) => Promise<void>;
  updateMaintenanceRecord: (id: string, data: Partial<MaintenanceFormData>) => Promise<void>;
  deleteMaintenanceRecord: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

interface MaintenanceFormData {
  equipment_id: string;
  maintenance_type: string;
  description: string;
  cost: number;
  performed_by: string;
  performed_at: string;
  notes?: string;
}

export const useEquipmentMaintenance = (
  equipmentId: string,
  isAuthenticated: boolean
): UseEquipmentMaintenanceResult => {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
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

      const { data, error: fetchError } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('asset_id', equipmentId)
        .eq('asset_type', 'equipment')
        .order('performed_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMaintenanceRecords(data || []);

    } catch (err: any) {
      console.error('Error fetching maintenance records:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [equipmentId, isAuthenticated]);

  const addMaintenanceRecord = async (data: MaintenanceFormData) => {
    if (!isAuthenticated) {
      setError('You must be logged in to add maintenance records');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('maintenance_records')
        .insert([{
          asset_id: data.equipment_id,
          asset_type: 'equipment',
          maintenance_type: data.maintenance_type,
          description: data.description,
          cost: data.cost,
          performed_by: data.performed_by,
          performed_at: data.performed_at,
          notes: data.notes || null
        }]);

      if (insertError) throw insertError;

      // Update equipment's last_maintenance and next_maintenance
      const nextMaintenanceDate = new Date(data.performed_at);
      nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3); // Default to 3 months

      const { error: updateError } = await supabase
        .from('equipment')
        .update({
          last_maintenance: data.performed_at,
          next_maintenance: nextMaintenanceDate.toISOString()
        })
        .eq('id', data.equipment_id);

      if (updateError) throw updateError;

      await fetchData();
    } catch (err: any) {
      console.error('Error adding maintenance record:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMaintenanceRecord = async (id: string, data: Partial<MaintenanceFormData>) => {
    if (!isAuthenticated) {
      setError('You must be logged in to update maintenance records');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('maintenance_records')
        .update({
          maintenance_type: data.maintenance_type,
          description: data.description,
          cost: data.cost,
          performed_by: data.performed_by,
          performed_at: data.performed_at,
          notes: data.notes
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchData();
    } catch (err: any) {
      console.error('Error updating maintenance record:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMaintenanceRecord = async (id: string) => {
    if (!isAuthenticated) {
      setError('You must be logged in to delete maintenance records');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('maintenance_records')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchData();
    } catch (err: any) {
      console.error('Error deleting maintenance record:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    maintenanceRecords,
    loading,
    error,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    refreshData: fetchData
  };
};