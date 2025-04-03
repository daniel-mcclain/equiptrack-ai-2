import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  MaintenanceTemplate, 
  MaintenanceSchedule,
  MaintenanceFormData,
  MaintenanceTemplateFormData,
  MaintenanceState
} from '../types/maintenance';
import { DEMO_MAINTENANCE_TEMPLATES, DEMO_MAINTENANCE_SCHEDULES } from '../data/demoData';

export const useMaintenance = (
  isAuthenticated: boolean,
  isLoading: boolean,
  selectedCompanyId: string | null,
  isGlobalAdmin: boolean = false
): MaintenanceState => {
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  // Track if data has been fetched for the current company
  const [dataFetched, setDataFetched] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('Fetching maintenance data...');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('selectedCompanyId:', selectedCompanyId);
    console.log('dataFetched:', dataFetched);
    
    // If we're already fetching data for this company, don't fetch again
    if (dataFetched === selectedCompanyId && templates.length > 0) {
      console.log('Data already fetched for this company, skipping');
      return;
    }
    
    // Clear existing data
    setTemplates([]);
    setSchedules([]);
    setError(null);

    // If not authenticated, use demo data
    if (!isAuthenticated) {
      console.log('Using demo maintenance data');
      setTemplates(DEMO_MAINTENANCE_TEMPLATES);
      setSchedules(DEMO_MAINTENANCE_SCHEDULES);
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

      // For regular users or global admins with a selected company, proceed with data fetch
      if (selectedCompanyId) {
        console.log('Using company ID:', selectedCompanyId);
        setCompanyId(selectedCompanyId);

        // Fetch maintenance templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('maintenance_templates')
          .select('*')
          .eq('company_id', selectedCompanyId)
          .eq('is_active', true)
          .order('name');

        if (templatesError) {
          console.error('Error fetching templates:', templatesError);
          throw templatesError;
        }

        console.log(`Fetched ${templatesData?.length || 0} templates`);
        setTemplates(templatesData || []);

        // Fetch maintenance schedules with template and vehicle info
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('vehicle_maintenance_schedules')
          .select(`
            *,
            template:template_id(
              id,
              name,
              schedule_type,
              description,
              interval_type,
              interval_value,
              is_active
            ),
            vehicle:vehicle_id(
              id,
              name,
              type
            )
          `)
          .eq('company_id', selectedCompanyId)
          .order('next_due');

        if (schedulesError) {
          console.error('Error fetching schedules:', schedulesError);
          throw schedulesError;
        }

        console.log(`Fetched ${schedulesData?.length || 0} schedules`);
        setSchedules(schedulesData || []);
        
        // Mark data as fetched for this company
        setDataFetched(selectedCompanyId);
      }

    } catch (err: any) {
      console.error('Error fetching maintenance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Maintenance data fetch completed');
    }
  };

  useEffect(() => {
    if (!isLoading) {
      console.log('Triggering maintenance data fetch');
      fetchData();
    }
  }, [isAuthenticated, isLoading, selectedCompanyId]);

  // Reset dataFetched when selectedCompanyId changes
  useEffect(() => {
    if (selectedCompanyId !== dataFetched) {
      console.log('Company ID changed, resetting data fetched flag');
      setDataFetched(null);
      setTemplates([]);
      setSchedules([]);
    }
  }, [selectedCompanyId, dataFetched]);

  const addTemplate = async (data: MaintenanceTemplateFormData): Promise<MaintenanceTemplate> => {
    console.log('Adding maintenance template:', data);
    if (!selectedCompanyId) throw new Error('No company selected');

    const { data: template, error } = await supabase
      .from('maintenance_templates')
      .insert([{
        ...data,
        company_id: selectedCompanyId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding template:', error);
      throw error;
    }
    if (!template) throw new Error('Failed to create template');

    console.log('Template added successfully:', template.id);
    setTemplates(prev => [...prev, template]);
    return template;
  };

  const updateTemplate = async (
    id: string, 
    data: Partial<MaintenanceTemplateFormData>
  ): Promise<MaintenanceTemplate> => {
    console.log('Updating maintenance template:', id, data);
    
    // Verify the template belongs to the current company
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('maintenance_templates')
      .select('company_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingTemplate) throw new Error('Template not found');
    if (existingTemplate.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Template belongs to a different company');
    
    const { data: template, error } = await supabase
      .from('maintenance_templates')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }
    if (!template) throw new Error('Template not found');

    console.log('Template updated successfully:', template.id);
    setTemplates(prev => 
      prev.map(t => t.id === template.id ? template : t)
    );
    return template;
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    console.log('Deleting maintenance template:', id);
    
    // Verify the template belongs to the current company
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('maintenance_templates')
      .select('company_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingTemplate) throw new Error('Template not found');
    if (existingTemplate.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Template belongs to a different company');
    
    const { error } = await supabase
      .from('maintenance_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }

    console.log('Template deleted successfully:', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const addSchedule = async (data: MaintenanceFormData): Promise<MaintenanceSchedule> => {
    console.log('Adding maintenance schedule:', data);
    if (!selectedCompanyId) throw new Error('No company selected');

    // Verify the vehicle belongs to the current company
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('company_id')
      .eq('id', data.vehicle_id)
      .single();
      
    if (vehicleError) throw vehicleError;
    if (!vehicle) throw new Error('Vehicle not found');
    if (vehicle.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Vehicle belongs to a different company');
    
    // Verify the template belongs to the current company
    const { data: template, error: templateError } = await supabase
      .from('maintenance_templates')
      .select('company_id')
      .eq('id', data.template_id)
      .single();
      
    if (templateError) throw templateError;
    if (!template) throw new Error('Template not found');
    if (template.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Template belongs to a different company');

    const { data: schedule, error } = await supabase
      .from('vehicle_maintenance_schedules')
      .insert([{
        ...data,
        company_id: selectedCompanyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        template:template_id(*),
        vehicle:vehicle_id(id, name, type)
      `)
      .single();

    if (error) {
      console.error('Error adding schedule:', error);
      throw error;
    }
    if (!schedule) throw new Error('Failed to create schedule');

    console.log('Schedule added successfully:', schedule.id);
    setSchedules(prev => [...prev, schedule]);
    return schedule;
  };

  const updateSchedule = async (
    id: string, 
    data: Partial<MaintenanceFormData>
  ): Promise<MaintenanceSchedule> => {
    console.log('Updating maintenance schedule:', id, data);
    
    // Verify the schedule belongs to the current company
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('vehicle_maintenance_schedules')
      .select('company_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingSchedule) throw new Error('Schedule not found');
    if (existingSchedule.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Schedule belongs to a different company');
    
    // If vehicle_id is being updated, verify it belongs to the current company
    if (data.vehicle_id) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('company_id')
        .eq('id', data.vehicle_id)
        .single();
        
      if (vehicleError) throw vehicleError;
      if (!vehicle) throw new Error('Vehicle not found');
      if (vehicle.company_id !== selectedCompanyId) 
        throw new Error('Unauthorized: Vehicle belongs to a different company');
    }
    
    // If template_id is being updated, verify it belongs to the current company
    if (data.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('maintenance_templates')
        .select('company_id')
        .eq('id', data.template_id)
        .single();
        
      if (templateError) throw templateError;
      if (!template) throw new Error('Template not found');
      if (template.company_id !== selectedCompanyId) 
        throw new Error('Unauthorized: Template belongs to a different company');
    }

    const { data: schedule, error } = await supabase
      .from('vehicle_maintenance_schedules')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        template:template_id(*),
        vehicle:vehicle_id(id, name, type)
      `)
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
    if (!schedule) throw new Error('Schedule not found');

    console.log('Schedule updated successfully:', schedule.id);
    setSchedules(prev => 
      prev.map(s => s.id === schedule.id ? schedule : s)
    );
    return schedule;
  };

  const deleteSchedule = async (id: string): Promise<void> => {
    console.log('Deleting maintenance schedule:', id);
    
    // Verify the schedule belongs to the current company
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('vehicle_maintenance_schedules')
      .select('company_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingSchedule) throw new Error('Schedule not found');
    if (existingSchedule.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Schedule belongs to a different company');
    
    const { error } = await supabase
      .from('vehicle_maintenance_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }

    console.log('Schedule deleted successfully:', id);
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const completeSchedule = async (id: string): Promise<MaintenanceSchedule> => {
    console.log('Completing maintenance schedule:', id);
    
    // Verify the schedule belongs to the current company
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('vehicle_maintenance_schedules')
      .select('company_id, template_id')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!existingSchedule) throw new Error('Schedule not found');
    if (existingSchedule.company_id !== selectedCompanyId) 
      throw new Error('Unauthorized: Schedule belongs to a different company');
    
    // Get template details to calculate next due date
    const { data: template, error: templateError } = await supabase
      .from('maintenance_templates')
      .select('interval_type, interval_value')
      .eq('id', existingSchedule.template_id)
      .single();
      
    if (templateError) throw templateError;
    if (!template) throw new Error('Template not found');
    
    // Calculate next due date based on interval
    const nextDue = new Date();
    if (template.interval_type === 'days') {
      nextDue.setDate(nextDue.getDate() + template.interval_value);
    } else if (template.interval_type === 'weeks') {
      nextDue.setDate(nextDue.getDate() + (template.interval_value * 7));
    } else if (template.interval_type === 'months') {
      nextDue.setMonth(nextDue.getMonth() + template.interval_value);
    }

    const { data: updatedSchedule, error } = await supabase
      .from('vehicle_maintenance_schedules')
      .update({
        last_completed: new Date().toISOString(),
        next_due: nextDue.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        template:template_id(*),
        vehicle:vehicle_id(id, name, type)
      `)
      .single();

    if (error) {
      console.error('Error completing schedule:', error);
      throw error;
    }
    if (!updatedSchedule) throw new Error('Failed to update schedule');

    console.log('Schedule completed successfully:', updatedSchedule.id);
    setSchedules(prev => 
      prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s)
    );
    return updatedSchedule;
  };

  return {
    templates,
    schedules,
    loading,
    error,
    companyId,
    refreshData: fetchData,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    completeSchedule
  };
};