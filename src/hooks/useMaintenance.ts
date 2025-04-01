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
  selectedCompanyId: string | null
): MaintenanceState => {
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('Fetching maintenance data...');
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

      // Fetch maintenance templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('maintenance_templates')
        .select('*')
        .eq('company_id', effectiveCompanyId)
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
        .eq('company_id', effectiveCompanyId)
        .order('next_due');

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError);
        throw schedulesError;
      }

      console.log(`Fetched ${schedulesData?.length || 0} schedules`);
      setSchedules(schedulesData || []);

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

  const addTemplate = async (data: MaintenanceTemplateFormData): Promise<MaintenanceTemplate> => {
    console.log('Adding maintenance template:', data);
    if (!companyId) throw new Error('No company selected');

    const { data: template, error } = await supabase
      .from('maintenance_templates')
      .insert([{
        ...data,
        company_id: companyId,
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
    if (!companyId) throw new Error('No company selected');

    const { data: schedule, error } = await supabase
      .from('vehicle_maintenance_schedules')
      .insert([{
        ...data,
        company_id: companyId,
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
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) throw new Error('Schedule not found');

    // Calculate next due date based on interval
    const nextDue = new Date();
    if (schedule.template.interval_type === 'days') {
      nextDue.setDate(nextDue.getDate() + schedule.template.interval_value);
    } else if (schedule.template.interval_type === 'weeks') {
      nextDue.setDate(nextDue.getDate() + (schedule.template.interval_value * 7));
    } else if (schedule.template.interval_type === 'months') {
      nextDue.setMonth(nextDue.getMonth() + schedule.template.interval_value);
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