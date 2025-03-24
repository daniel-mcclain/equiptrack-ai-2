import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  Bell,
  Globe,
  Sun,
  Moon,
  Shield,
  Link as LinkIcon,
  Calendar,
  Camera,
  Check,
  X,
  Monitor
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  language: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  profileVisibility: z.enum(['public', 'private', 'contacts']),
  twoFactorEnabled: z.boolean(),
  isTechnician: z.boolean(),
  jobTitle: z.string().optional(),
  hireDate: z.string().optional(),
  certifications: z.array(z.string()),
  skills: z.array(z.string()),
  hourlyRate: z.string().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' }
];

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System Default', icon: Monitor }
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Visible to everyone' },
  { value: 'private', label: 'Private', description: 'Only visible to you' },
  { value: 'contacts', label: 'Contacts Only', description: 'Only visible to your contacts' }
];

const Profile = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isTechnician, setIsTechnician] = useState(false);
  const [technicianData, setTechnicianData] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      theme: 'system',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      profileVisibility: 'private',
      twoFactorEnabled: false
    }
  });

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Use maybeSingle() instead of single() to avoid error when no record exists
        const { data: techData, error: techError } = await supabase
          .from('technicians')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Only throw error if it's not a "no rows returned" error
        if (techError && techError.code !== 'PGRST116') throw techError;
        
        setTechnicianData(techData);
        setIsTechnician(!!techData);

        reset({
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: user.email || '',
          phone: profile.phone || '',
          dateOfBirth: profile.date_of_birth || '',
          city: profile.city || '',
          state: profile.state || '',
          language: profile.language || 'en',
          theme: profile.theme || 'system',
          emailNotifications: profile.email_notifications || true,
          pushNotifications: profile.push_notifications || true,
          smsNotifications: profile.sms_notifications || false,
          profileVisibility: profile.profile_visibility || 'private',
          twoFactorEnabled: profile.two_factor_enabled || false,
          isTechnician: !!techData,
          jobTitle: techData?.job_title || '',
          hireDate: techData?.hire_date || '',
          certifications: techData?.certifications || [],
          skills: techData?.skills || [],
          hourlyRate: techData?.hourly_rate?.toString() || ''
        });

        setAvatarUrl(profile.avatar_url);
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadUserProfile();
    } else {
      reset({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        language: 'en',
        theme: 'system',
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        profileVisibility: 'private',
        twoFactorEnabled: false,
        isTechnician: false,
        jobTitle: '',
        hireDate: '',
        certifications: [],
        skills: [],
        hourlyRate: ''
      });
      setAvatarUrl('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e');
      setLoading(false);
    }
  }, [isAuthenticated, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!isAuthenticated) {
      setError('Please sign in to update your profile');
      return;
    }

    setSaving(true);
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

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          date_of_birth: data.dateOfBirth || null,
          city: data.city || null,
          state: data.state || null,
          language: data.language,
          theme: data.theme,
          email_notifications: data.emailNotifications,
          push_notifications: data.pushNotifications,
          sms_notifications: data.smsNotifications,
          profile_visibility: data.profileVisibility,
          two_factor_enabled: data.twoFactorEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Handle technician data
      if (data.isTechnician) {
        const technicianData = {
          user_id: user.id,
          company_id: company.id,
          job_title: data.jobTitle,
          hire_date: data.hireDate,
          certifications: data.certifications,
          skills: data.skills,
          hourly_rate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          updated_at: new Date().toISOString()
        };

        // Check if technician record exists
        const { data: existingTech } = await supabase
          .from('technicians')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingTech) {
          // Update existing technician record
          const { error: techUpdateError } = await supabase
            .from('technicians')
            .update(technicianData)
            .eq('user_id', user.id);

          if (techUpdateError) throw techUpdateError;
        } else {
          // Create new technician record
          const { error: techInsertError } = await supabase
            .from('technicians')
            .insert([technicianData]);

          if (techInsertError) throw techInsertError;
        }
      } else {
        // Remove technician record if exists and checkbox is unchecked
        const { error: techDeleteError } = await supabase
          .from('technicians')
          .delete()
          .eq('user_id', user.id);

        if (techDeleteError) throw techDeleteError;
      }

      setSuccess('Profile updated successfully');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      setError('Please sign in to update your profile picture');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSuccess('Profile picture updated successfully');
    } catch (err: any) {
      console.error('Error updating avatar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {!isAuthenticated && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👋 Welcome to the demo! You're viewing sample profile data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your own profile.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <X className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <Check className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Profile Picture
              </label>
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50"
                  >
                    <Camera className="h-4 w-4 text-gray-600" />
                    <input
                      id="avatar-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Upload a new profile picture. JPG, GIF or PNG. Max size of 2MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  {...register('firstName')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  {...register('lastName')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  {...register('email')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...register('phone')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  {...register('dateOfBirth')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  {...register('city')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  {...register('state')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                    Language
                  </label>
                  <select
                    id="language"
                    {...register('language')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                    Theme
                  </label>
                  <select
                    id="theme"
                    {...register('theme')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {THEMES.map(theme => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    {...register('emailNotifications')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emailNotifications" className="ml-3">
                    <span className="block text-sm font-medium text-gray-700">Email Notifications</span>
                    <span className="block text-sm text-gray-500">Receive updates via email</span>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="pushNotifications"
                    {...register('pushNotifications')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="pushNotifications" className="ml-3">
                    <span className="block text-sm font-medium text-gray-700">Push Notifications</span>
                    <span className="block text-sm text-gray-500">Receive browser notifications</span>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="smsNotifications"
                    {...register('smsNotifications')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smsNotifications" className="ml-3">
                    <span className="block text-sm font-medium text-gray-700">SMS Notifications</span>
                    <span className="block text-sm text-gray-500">Receive text message updates</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="profileVisibility" className="block text-sm font-medium text-gray-700">
                    Profile Visibility
                  </label>
                  <select
                    id="profileVisibility"
                    {...register('profileVisibility')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {VISIBILITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="twoFactorEnabled"
                    {...register('twoFactorEnabled')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="twoFactorEnabled" className="ml-3">
                    <span className="block text-sm font-medium text-gray-700">Two-Factor Authentication</span>
                    <span className="block text-sm text-gray-500">Add an extra layer of security to your account</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Password</h3>
              
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technician Status</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isTechnician"
                      {...register('isTechnician')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isTechnician" className="ml-2 block text-sm text-gray-900">
                      Register as Technician
                    </label>
                  </div>

                  {watch('isTechnician') && (
                    <div className="space-y-6 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                            Job Title
                          </label>
                          <input
                            type="text"
                            id="jobTitle"
                            {...register('jobTitle')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700">
                            Hire Date
                          </label>
                          <input
                            type="date"
                            id="hireDate"
                            {...register('hireDate')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                            Hourly Rate
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            id="hourlyRate"
                            {...register('hourlyRate')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => reset()}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;