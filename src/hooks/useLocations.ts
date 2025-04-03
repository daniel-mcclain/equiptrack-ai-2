import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Location, LocationFormData, UseLocationsResult } from '../types/location';

export const useLocations = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null
): UseLocationsResult => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLocations, setTotalLocations] = useState(0);
  // Track if data has been fetched for the current company
  const [dataFetched, setDataFetched] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log('Fetching locations data...');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('selectedCompanyId:', selectedCompanyId);
    console.log('dataFetched:', dataFetched);
    
    // If we're already fetching data for this company, don't fetch again
    if (dataFetched === selectedCompanyId && locations.length > 0) {
      console.log('Data already fetched for this company, skipping');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('Using demo locations data');
      setLocations([]);
      setTotalLocations(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!selectedCompanyId) {
        console.log('No company ID found, skipping data fetch');
        setLocations([]);
        setTotalLocations(0);
        setLoading(false);
        return;
      }

      console.log('Using company ID:', selectedCompanyId);

      // Fetch locations for the company
      const { data: locationsData, error: locationsError, count } = await supabase
        .from('locations')
        .select('*', { count: 'exact' })
        .eq('company_id', selectedCompanyId)
        .is('deleted_at', null)
        .order('name');

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
        throw locationsError;
      }
      
      console.log(`Fetched ${locationsData?.length || 0} locations`);
      setLocations(locationsData || []);
      setTotalLocations(count || 0);
      
      // Mark data as fetched for this company
      setDataFetched(selectedCompanyId);

    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Locations data fetch completed');
    }
  }, [isAuthenticated, selectedCompanyId, locations.length, dataFetched]);

  useEffect(() => {
    if (!isLoading && (isAuthenticated || !isAuthenticated)) {
      console.log('Triggering locations data fetch');
      fetchData();
    }
  }, [isAuthenticated, isLoading, selectedCompanyId, fetchData]);

  // Reset dataFetched when selectedCompanyId changes
  useEffect(() => {
    if (selectedCompanyId !== dataFetched) {
      console.log('Company ID changed, resetting data fetched flag');
      setDataFetched(null);
      setLocations([]);
      setTotalLocations(0);
    }
  }, [selectedCompanyId, dataFetched]);

  const addLocation = async (data: LocationFormData): Promise<Location> => {
    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    try {
      const { data: location, error } = await supabase
        .from('locations')
        .insert([{
          ...data,
          company_id: selectedCompanyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      if (!location) throw new Error('Failed to create location');

      setLocations(prev => [...prev, location]);
      setTotalLocations(prev => prev + 1);
      
      return location;
    } catch (err: any) {
      console.error('Error adding location:', err);
      throw err;
    }
  };

  const updateLocation = async (id: string, data: Partial<LocationFormData>): Promise<Location> => {
    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    try {
      // Verify the location belongs to the current company
      const { data: existingLocation, error: fetchError } = await supabase
        .from('locations')
        .select('company_id')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingLocation) throw new Error('Location not found');
      if (existingLocation.company_id !== selectedCompanyId) 
        throw new Error('Unauthorized: Location belongs to a different company');

      const { data: location, error } = await supabase
        .from('locations')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!location) throw new Error('Location not found');

      setLocations(prev => prev.map(loc => loc.id === id ? location : loc));
      
      return location;
    } catch (err: any) {
      console.error('Error updating location:', err);
      throw err;
    }
  };

  const deleteLocation = async (id: string): Promise<void> => {
    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    try {
      // Verify the location belongs to the current company
      const { data: existingLocation, error: fetchError } = await supabase
        .from('locations')
        .select('company_id')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingLocation) throw new Error('Location not found');
      if (existingLocation.company_id !== selectedCompanyId) 
        throw new Error('Unauthorized: Location belongs to a different company');

      // Soft delete by setting deleted_at timestamp
      const { error } = await supabase
        .from('locations')
        .update({
          status: 'inactive',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setLocations(prev => prev.filter(loc => loc.id !== id));
      setTotalLocations(prev => prev - 1);
    } catch (err: any) {
      console.error('Error deleting location:', err);
      throw err;
    }
  };

  const bulkUpdateLocations = async (ids: string[], data: Partial<LocationFormData>): Promise<void> => {
    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    try {
      // Verify all locations belong to the current company
      const { data: existingLocations, error: fetchError } = await supabase
        .from('locations')
        .select('id, company_id')
        .in('id', ids);
        
      if (fetchError) throw fetchError;
      
      // Check if any location belongs to a different company
      const unauthorizedLocations = existingLocations?.filter(loc => loc.company_id !== selectedCompanyId);
      if (unauthorizedLocations && unauthorizedLocations.length > 0) {
        throw new Error('Unauthorized: Some locations belong to a different company');
      }

      const { error } = await supabase
        .from('locations')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) throw error;

      // Refresh data after bulk update
      await fetchData();
    } catch (err: any) {
      console.error('Error bulk updating locations:', err);
      throw err;
    }
  };

  return {
    locations,
    loading,
    error,
    totalLocations,
    refreshData: fetchData,
    addLocation,
    updateLocation,
    deleteLocation,
    bulkUpdateLocations
  };
};