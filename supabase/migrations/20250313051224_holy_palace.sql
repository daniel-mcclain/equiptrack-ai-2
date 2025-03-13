/*
  # Add Profile Fields to Users Table

  1. Changes
    - Add profile-related columns to users table:
      - city (text)
      - date_of_birth (date)
      - language (text)
      - theme (text)
      - email_notifications (boolean)
      - push_notifications (boolean)
      - sms_notifications (boolean)
      - profile_visibility (text)
      - two_factor_enabled (boolean)
      - avatar_url (text)

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add profile fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add constraint for theme values
ALTER TABLE users
  ADD CONSTRAINT valid_theme
  CHECK (theme IN ('light', 'dark', 'system'));

-- Add constraint for profile visibility
ALTER TABLE users
  ADD CONSTRAINT valid_profile_visibility
  CHECK (profile_visibility IN ('public', 'private', 'contacts'));

-- Update handle_new_user function to include new defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    first_name,
    last_name,
    email,
    role,
    status,
    language,
    theme,
    email_notifications,
    push_notifications,
    sms_notifications,
    profile_visibility,
    two_factor_enabled,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'first_name'),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'last_name'),
      'User'
    ),
    NEW.email,
    'user',
    'active',
    'en',
    'system',
    true,
    true,
    false,
    'private',
    false,
    now(),
    now()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;