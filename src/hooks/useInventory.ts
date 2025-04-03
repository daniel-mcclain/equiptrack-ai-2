import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

interface UseInventoryResult {
  parts: Part[];
  loading: boolean;
  error: string | null;
  companyId: string | null;
  refreshData: () => Promise<void>;
}

export const useInventory = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null
): UseInventoryResult => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  // Track if data has been fetched for the current company
  const [dataFetched, setDataFetched] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('Fetching inventory data...');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('selectedCompanyId:', selectedCompanyId);
    console.log('dataFetched:', dataFetched);
    
    // If we're already fetching data for this company, don't fetch again
    if (dataFetched === selectedCompanyId && parts.length > 0) {
      console.log('Data already fetched for this company, skipping');
      return;
    }
    
    // Clear existing data
    setParts([]);
    setError(null);

    if (!isAuthenticated) {
      console.log('User not authenticated, skipping data fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!selectedCompanyId) {
        console.log('No company ID found, skipping data fetch');
        setParts([]);
        setTotalParts(0);
        setLoading(false);
        throw new Error('No company found');
      }

      console.log('Using company ID:', selectedCompanyId);
      setCompanyId(selectedCompanyId);

      // Fetch parts inventory for the company
      const { data: partsData, error: partsError } = await supabase
        .from('parts_inventory')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('part_number');

      if (partsError) {
        console.error('Error fetching parts:', partsError);
        throw partsError;
      }
      
      console.log(`Fetched ${partsData?.length || 0} parts`);
      setParts(partsData || []);
      
      // Mark data as fetched for this company
      setDataFetched(selectedCompanyId);

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Inventory data fetch completed');
    }
  };

  useEffect(() => {
    if (!isLoading) {
      console.log('Triggering inventory data fetch');
      fetchData();
    }
  }, [isAuthenticated, isLoading, selectedCompanyId]);

  // Reset dataFetched when selectedCompanyId changes
  useEffect(() => {
    if (selectedCompanyId !== dataFetched) {
      console.log('Company ID changed, resetting data fetched flag');
      setDataFetched(null);
      setParts([]);
    }
  }, [selectedCompanyId, dataFetched]);

  return {
    parts,
    loading,
    error,
    companyId,
    refreshData: fetchData
  };
};