import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkOrder, WorkOrderFormData, WorkOrderState } from '../types/workOrder';

export const useWorkOrder = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null,
  isGlobalAdmin: boolean = false
): WorkOrderState => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  // Track if data has been fetched for the current company
  const [dataFetched, setDataFetched] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('Fetching work orders data...');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('selectedCompanyId:', selectedCompanyId);
    console.log('dataFetched:', dataFetched);
    
    // If we're already fetching data for this company, don't fetch again
    if (dataFetched === selectedCompanyId && workOrders.length > 0) {
      console.log('Data already fetched for this company, skipping');
      return;
    }
    
    // Clear existing data
    setWorkOrders([]);
    setError(null);

    // If not authenticated, return empty data
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping data fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // For global admins without a selected company, just set loading to false
      if (isGlobalAdmin && !selectedCompanyId) {
        console.log('Global admin without company selected');
        setLoading(false);
        return;
      }

      // For regular users without a company, show an error
      if (!selectedCompanyId && !isGlobalAdmin) {
        console.log('No company found for regular user');
        setLoading(false);
        throw new Error('No company assigned. Please contact your administrator.');
      }

      if (selectedCompanyId) {
        console.log('Using company ID:', selectedCompanyId);
        setCompanyId(selectedCompanyId);

        // Fetch work orders with asset details
        const { data: orders, error: ordersError } = await supabase
          .from('work_orders')
          .select('*')
          .eq('company_id', selectedCompanyId)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('Error fetching work orders:', ordersError);
          throw ordersError;
        }

        console.log(`Fetched ${orders?.length || 0} work orders`);

        // Then, for each work order, fetch the asset details based on asset_type
        const workOrdersWithAssets = await Promise.all((orders || []).map(async (order) => {
          let assetDetails = null;
          
          if (order.asset_type === 'vehicle') {
            const { data: vehicle } = await supabase
              .from('vehicles')
              .select('name')
              .eq('id', order.asset_id)
              .single();
            assetDetails = vehicle;
          } else if (order.asset_type === 'equipment') {
            const { data: equipment } = await supabase
              .from('equipment')
              .select('name')
              .eq('id', order.asset_id)
              .single();
            assetDetails = equipment;
          }

          return {
            ...order,
            asset_details: assetDetails
          };
        }));

        console.log('Asset details fetched for all work orders');
        setWorkOrders(workOrdersWithAssets);
        
        // Mark data as fetched for this company
        setDataFetched(selectedCompanyId);
      }

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Work orders data fetch completed');
    }
  };

  useEffect(() => {
    if (!isLoading) {
      console.log('Triggering work orders data fetch');
      fetchData();
    }
  }, [isAuthenticated, isLoading, selectedCompanyId]);

  // Reset dataFetched when selectedCompanyId changes
  useEffect(() => {
    if (selectedCompanyId !== dataFetched) {
      console.log('Company ID changed, resetting data fetched flag');
      setDataFetched(null);
      setWorkOrders([]);
    }
  }, [selectedCompanyId, dataFetched]);

  const addWorkOrder = async (data: WorkOrderFormData): Promise<WorkOrder> => {
    console.log('Adding work order:', data);
    if (!selectedCompanyId) throw new Error('No company selected');

    // Verify the asset belongs to the current company
    if (data.asset_type === 'vehicle') {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('company_id')
        .eq('id', data.asset_id)
        .single();
        
      if (vehicleError) throw vehicleError;
      if (!vehicle) throw new Error('Vehicle not found');
      if (vehicle.company_id !== selectedCompanyId) 
        throw new Error('Unauthorized: Vehicle belongs to a different company');
    } else if (data.asset_type === 'equipment') {
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('company_id')
        .eq('id', data.asset_id)
        .single();
        
      if (equipmentError) throw equipmentError;
      if (!equipment) throw new Error('Equipment not found');
      if (equipment.company_id !== selectedCompanyId) 
        throw new Error('Unauthorized: Equipment belongs to a different company');
    }

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .insert([{
        ...data,
        company_id: selectedCompanyId,
        status: 'pending',
        created_by: (await supabase.auth.getUser()).data.user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding work order:', error);
      throw error;
    }
    if (!workOrder) throw new Error('Failed to create work order');

    console.log('Work order added successfully:', workOrder.id);
    setWorkOrders(prev => [workOrder, ...prev]);
    return workOrder;
  };

  const updateWorkOrder = async (
    id: string, 
    data: Partial<WorkOrderFormData>
  ): Promise<WorkOrder> => {
    console.log('Updating work order:', id, data);
    
    // Verify the work order belongs to the current company
    const { data: existingWorkOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('company_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingWorkOrder) throw new Error('Work order not found');
    if (existingWorkOrder.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Work order belongs to a different company');
    
    // If asset_id is being updated, verify it belongs to the current company
    if (data.asset_id && data.asset_type) {
      if (data.asset_type === 'vehicle') {
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select('company_id')
          .eq('id', data.asset_id)
          .single();
          
        if (vehicleError) throw vehicleError;
        if (!vehicle) throw new Error('Vehicle not found');
        if (vehicle.company_id !== selectedCompanyId) 
          throw new Error('Unauthorized: Vehicle belongs to a different company');
      } else if (data.asset_type === 'equipment') {
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('company_id')
          .eq('id', data.asset_id)
          .single();
          
        if (equipmentError) throw equipmentError;
        if (!equipment) throw new Error('Equipment not found');
        if (equipment.company_id !== selectedCompanyId) 
          throw new Error('Unauthorized: Equipment belongs to a different company');
      }
    }

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating work order:', error);
      throw error;
    }
    if (!workOrder) throw new Error('Work order not found');

    console.log('Work order updated successfully:', workOrder.id);
    setWorkOrders(prev => 
      prev.map(wo => wo.id === workOrder.id ? workOrder : wo)
    );
    return workOrder;
  };

  const deleteWorkOrder = async (id: string): Promise<void> => {
    console.log('Deleting work order:', id);
    
    // Verify the work order belongs to the current company
    const { data: existingWorkOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('company_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingWorkOrder) throw new Error('Work order not found');
    if (existingWorkOrder.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Work order belongs to a different company');
    
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting work order:', error);
      throw error;
    }

    console.log('Work order deleted successfully:', id);
    setWorkOrders(prev => prev.filter(wo => wo.id !== id));
  };

  const updateWorkOrderStatus = async (
    id: string, 
    status: WorkOrder['status']
  ): Promise<WorkOrder> => {
    console.log('Updating work order status:', id, status);
    
    // Verify the work order belongs to the current company
    const { data: existingWorkOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('company_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingWorkOrder) throw new Error('Work order not found');
    if (existingWorkOrder.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Work order belongs to a different company');
    
    const updates: Partial<WorkOrder> = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add completed_at timestamp if completing the work order
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating work order status:', error);
      throw error;
    }
    if (!workOrder) throw new Error('Work order not found');

    console.log('Work order status updated successfully:', workOrder.id);
    setWorkOrders(prev => 
      prev.map(wo => wo.id === workOrder.id ? workOrder : wo)
    );
    return workOrder;
  };

  const completeWorkOrder = async (id: string): Promise<WorkOrder> => {
    console.log('Completing work order:', id);
    return updateWorkOrderStatus(id, 'completed');
  };

  const cancelWorkOrder = async (id: string): Promise<WorkOrder> => {
    console.log('Cancelling work order:', id);
    return updateWorkOrderStatus(id, 'cancelled');
  };

  const holdWorkOrder = async (id: string): Promise<WorkOrder> => {
    console.log('Putting work order on hold:', id);
    return updateWorkOrderStatus(id, 'on_hold');
  };

  const resumeWorkOrder = async (id: string): Promise<WorkOrder> => {
    console.log('Resuming work order:', id);
    return updateWorkOrderStatus(id, 'in_progress');
  };

  return {
    workOrders,
    loading,
    error,
    companyId,
    refreshData: fetchData,
    addWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    completeWorkOrder,
    cancelWorkOrder,
    holdWorkOrder,
    resumeWorkOrder
  };
};