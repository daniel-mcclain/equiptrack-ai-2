import { useState, useEffect, useCallback } from 'react';
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
  // Track if data has been fetched for the current company
  const [dataFetched, setDataFetched] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log('Fetching vehicles data...');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('selectedCompanyId:', selectedCompanyId);
    console.log('dataFetched:', dataFetched);
    
    // If we're already fetching data for this company, don't fetch again
    if (dataFetched === selectedCompanyId && vehicles.length > 0) {
      console.log('Data already fetched for this company, skipping');
      return;
    }
    
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

      if (!selectedCompanyId) {
        console.log('No company ID found, skipping data fetch');
        setVehicles([]);
        setTotalVehicles(0);
        setLoading(false);
        return;
      }

      console.log('Using company ID:', selectedCompanyId);

      // Get company details for vehicle limit
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('max_vehicles')
        .eq('id', selectedCompanyId)
        .single();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        throw companyError;
      }
      
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
        .eq('company_id', selectedCompanyId)
        .neq('status', 'Deleted')
        .order('name');

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
        throw vehiclesError;
      }
      
      console.log(`Fetched ${vehiclesData?.length || 0} vehicles`);
      setVehicles(vehiclesData || []);
      setTotalVehicles(vehiclesData?.length || 0);
      
      // Mark data as fetched for this company
      setDataFetched(selectedCompanyId);

    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Vehicles data fetch completed');
    }
  }, [isAuthenticated, selectedCompanyId, vehicles.length, dataFetched]);

  useEffect(() => {
    if (!isLoading && (isAuthenticated || !isAuthenticated)) {
      console.log('Triggering vehicles data fetch');
      fetchData();
    }
  }, [isAuthenticated, isLoading, selectedCompanyId, fetchData]);

  // Reset dataFetched when selectedCompanyId changes
  useEffect(() => {
    if (selectedCompanyId !== dataFetched) {
      console.log('Company ID changed, resetting data fetched flag');
      setDataFetched(null);
      setVehicles([]);
      setTotalVehicles(0);
    }
  }, [selectedCompanyId, dataFetched]);

  return {
    vehicles,
    loading,
    error,
    totalVehicles,
    maxVehicles,
    refreshData: fetchData
  };
};