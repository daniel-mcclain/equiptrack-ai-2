import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Technician {
  id: string;
  user_id: string;
  status: string;
  job_title: string | null;
  hire_date: string | null;
  certifications: string[];
  skills: string[];
  hourly_rate: number | null;
  notes: string | null;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
}

interface TechnicianFormData {
  user_id: string;
  status: string;
  job_title: string;
  hire_date: string;
  certifications: string[];
  skills: string[];
  hourly_rate: string;
  notes: string;
}

const INITIAL_FORM_DATA: TechnicianFormData = {
  user_id: '',
  status: 'active',
  job_title: '',
  hire_date: '',
  certifications: [],
  skills: [],
  hourly_rate: '',
  notes: ''
};

// Rest of the imports and constants remain the same...

export const TechniciansManagement = () => {
  // State declarations remain the same...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Please sign in to manage technicians');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!company) throw new Error('No company found');

      // Check if user is already a technician
      if (!editingId) {
        const { data: existingTech, error: checkError } = await supabase
          .from('technicians')
          .select('id')
          .eq('user_id', formData.user_id)
          .eq('company_id', company.id)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingTech) {
          throw new Error('This user is already a technician in your company');
        }
      }

      const technicianData = {
        company_id: company.id,
        user_id: formData.user_id,
        status: formData.status,
        job_title: formData.job_title || null,
        hire_date: formData.hire_date || null,
        certifications: formData.certifications,
        skills: formData.skills,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('technicians')
          .update(technicianData)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccess('Technician updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('technicians')
          .insert([technicianData]);

        if (insertError) throw insertError;
        setSuccess('Technician added successfully');
      }

      // Refresh technicians list
      const { data: updatedTechnicians, error: fetchError } = await supabase
        .from('technicians')
        .select(`
          *,
          user:user_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('company_id', company.id)
        .order('user(last_name)', { ascending: true });

      if (fetchError) throw fetchError;
      setTechnicians(updatedTechnicians || []);

      // Reset form
      setFormData(INITIAL_FORM_DATA);
      setShowForm(false);
      setEditingId(null);

      // Update available users list
      const existingTechUserIds = (updatedTechnicians || []).map(t => t.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('company_id', company.id)
        .order('last_name');

      if (usersError) throw usersError;
      setAvailableUsers((users || []).filter(user => 
        !existingTechUserIds.includes(user.id)
      ));

    } catch (err: any) {
      console.error('Error managing technician:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component remains the same...
};