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

  const fetchData = async () => {
    console.log('Fetching inventory data...');
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        throw new Error('No user found');
      }

      // Get user's company or use selected company for global admin
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, is_global_admin')
        .eq('id', user.id)
        .single();

      const effectiveCompanyId = selectedCompanyId || userData?.company_id;
      if (!effectiveCompanyId) {
        console.log('No company found');
        throw new Error('No company found');
      }

      console.log('Using company ID:', effectiveCompanyId);
      setCompanyId(effectiveCompanyId);

      // Fetch parts inventory for the company
      const { data: partsData, error: partsError } = await supabase
        .from('parts_inventory')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('part_number');

      if (partsError) {
        console.error('Error fetching parts:', partsError);
        throw partsError;
      }

      console.log(`Fetched ${partsData?.length || 0} parts`);
      setParts(partsData || []);

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

  return {
    parts,
    loading,
    error,
    companyId,
    refreshData: fetchData
  };
};