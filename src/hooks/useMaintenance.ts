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
    // Clear existing data
    setTemplates([]);
    setSchedules([]);
    setError(null);

    // If not authenticated, use demo data
    if (!isAuthenticated) {
      setTemplates(DEMO_MAINTENANCE_TEMPLATES);
      setSchedules(DEMO_MAINTENANCE_SCHEDULES);
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

      // Fetch maintenance templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('maintenance_templates')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true)
        .order('name');

      if (templatesError) throw templatesError;
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

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);

    } catch (err: any) {
      console.error('Error fetching maintenance data:', err);
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

  const addTemplate = async (data: MaintenanceTemplateFormData): Promise<MaintenanceTemplate> => {
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

    if (error) throw error;
    if (!template) throw new Error('Failed to create template');

    setTemplates(prev => [...prev, template]);
    return template;
  };

  const updateTemplate = async (
    id: string, 
    data: Partial<MaintenanceTemplateFormData>
  ): Promise<MaintenanceTemplate> => {
    const { data: template, error } = await supabase
      .from('maintenance_templates')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!template) throw new Error('Template not found');

    setTemplates(prev => 
      prev.map(t => t.id === template.id ? template : t)
    );
    return template;
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('maintenance_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const addSchedule = async (data: MaintenanceFormData): Promise<MaintenanceSchedule> => {
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

    if (error) throw error;
    if (!schedule) throw new Error('Failed to create schedule');

    setSchedules(prev => [...prev, schedule]);
    return schedule;
  };

  const updateSchedule = async (
    id: string, 
    data: Partial<MaintenanceFormData>
  ): Promise<MaintenanceSchedule> => {
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

    if (error) throw error;
    if (!schedule) throw new Error('Schedule not found');

    setSchedules(prev => 
      prev.map(s => s.id === schedule.id ? schedule : s)
    );
    return schedule;
  };

  const deleteSchedule = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('vehicle_maintenance_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const completeSchedule = async (id: string): Promise<MaintenanceSchedule> => {
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

    if (error) throw error;
    if (!updatedSchedule) throw new Error('Failed to update schedule');

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