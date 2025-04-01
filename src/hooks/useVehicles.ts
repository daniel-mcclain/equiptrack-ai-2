import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Vehicle } from '../types/vehicle';
import { DEMO_VEHICLES } from '../data/demoData';

interface UseVehiclesResult {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  totalVehicles: number;
  maxVehicles: number;
  refreshData: () => Promise<void>;
}

export const useVehicles = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null
): UseVehiclesResult => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [maxVehicles, setMaxVehicles] = useState(0);

  const fetchData = async () => {
    console.log('Fetching vehicles data...');
    if (!isAuthenticated) {
      console.log('Using demo vehicles data');
      setVehicles(DEMO_VEHICLES);
      setTotalVehicles(DEMO_VEHICLES.length);
      setMaxVehicles(50);
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

      // Get company details for vehicle limit
      const { data: company } = await supabase
        .from('companies')
        .select('max_vehicles')
        .eq('id', effectiveCompanyId)
        .single();

      if (!company) {
        console.log('Company not found');
        throw new Error('Company not found');
      }
      
      console.log('Company max vehicles:', company.max_vehicles);
      setMaxVehicles(company.max_vehicles);

      // Fetch vehicles for the company
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .neq('status', 'Deleted')
        .order('name');

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
        throw vehiclesError;
      }
      
      console.log(`Fetched ${vehiclesData?.length || 0} vehicles`);
      setVehicles(vehiclesData || []);
      setTotalVehicles(vehiclesData?.length || 0);

    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Vehicles data fetch completed');
    }
  };

  useEffect(() => {
    if (!isLoading) {
      console.log('Triggering vehicles data fetch');
      fetchData();
    }
  }, [isAuthenticated, isLoading, selectedCompanyId]);

  return {
    vehicles,
    loading,
    error,
    totalVehicles,
    maxVehicles,
    refreshData: fetchData
  };
};