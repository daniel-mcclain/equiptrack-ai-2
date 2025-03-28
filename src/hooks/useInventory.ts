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
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user's company or use selected company for global admin
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, is_global_admin')
        .eq('id', user.id)
        .single();

      const effectiveCompanyId = selectedCompanyId || userData?.company_id;
      if (!effectiveCompanyId) throw new Error('No company found');

      setCompanyId(effectiveCompanyId);

      // Fetch parts inventory for the company
      const { data: partsData, error: partsError } = await supabase
        .from('parts_inventory')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('part_number');

      if (partsError) throw partsError;
      setParts(partsData || []);

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
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