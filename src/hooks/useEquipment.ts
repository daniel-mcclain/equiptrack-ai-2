import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Equipment } from '../types/equipment';
import { DEMO_EQUIPMENT } from '../data/demoData';

interface UseEquipmentResult {
  equipment: Equipment[];
  loading: boolean;
  error: string | null;
  totalEquipment: number;
  refreshData: () => Promise<void>;
}

export const useEquipment = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null
): UseEquipmentResult => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEquipment, setTotalEquipment] = useState(0);
  // Track if data has been fetched for the current company
  const [dataFetched, setDataFetched] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log('Fetching equipment data...');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('selectedCompanyId:', selectedCompanyId);
    console.log('dataFetched:', dataFetched);
    
    // If we're already fetching data for this company, don't fetch again
    if (dataFetched === selectedCompanyId && equipment.length > 0) {
      console.log('Data already fetched for this company, skipping');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('Using demo equipment data');
      setEquipment(DEMO_EQUIPMENT);
      setTotalEquipment(DEMO_EQUIPMENT.length);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!selectedCompanyId) {
        console.log('No company ID found, skipping data fetch');
        setEquipment([]);
        setTotalEquipment(0);
        setLoading(false);
        return;
      }

      console.log('Using company ID:', selectedCompanyId);

      // Fetch equipment for the company
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .neq('status', 'Deleted')
        .order('name');

      if (equipmentError) {
        console.error('Error fetching equipment:', equipmentError);
        throw equipmentError;
      }
      
      console.log(`Fetched ${equipmentData?.length || 0} equipment items`);
      setEquipment(equipmentData || []);
      setTotalEquipment(equipmentData?.length || 0);
      
      // Mark data as fetched for this company
      setDataFetched(selectedCompanyId);

    } catch (err: any) {
      console.error('Error fetching equipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Equipment data fetch completed');
    }
  }, [isAuthenticated, selectedCompanyId, equipment.length, dataFetched]);

  useEffect(() => {
    if (!isLoading && (isAuthenticated || !isAuthenticated)) {
      console.log('Triggering equipment data fetch');
      fetchData();
    }
  }, [isAuthenticated, isLoading, selectedCompanyId, fetchData]);

  // Reset dataFetched when selectedCompanyId changes
  useEffect(() => {
    if (selectedCompanyId !== dataFetched) {
      console.log('Company ID changed, resetting data fetched flag');
      setDataFetched(null);
      setEquipment([]);
      setTotalEquipment(0);
    }
  }, [selectedCompanyId, dataFetched]);

  return {
    equipment,
    loading,
    error,
    totalEquipment,
    refreshData: fetchData
  };
};