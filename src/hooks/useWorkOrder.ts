import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkOrder, WorkOrderFormData, WorkOrderState } from '../types/workOrder';

export const useWorkOrder = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null
): WorkOrderState => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('Fetching work orders data...');
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

      // Fetch work orders with asset details
      const { data: orders, error: ordersError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('company_id', effectiveCompanyId)
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

  const addWorkOrder = async (data: WorkOrderFormData): Promise<WorkOrder> => {
    console.log('Adding work order:', data);
    if (!companyId) throw new Error('No company selected');

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .insert([{
        ...data,
        company_id: companyId,
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