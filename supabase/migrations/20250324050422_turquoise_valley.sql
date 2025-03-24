/*
  # Add Location Field to Users Table

  1. Changes
    - Add location column to users table
    - Update handle_new_user function to include location field
    - Add index for better query performance

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add location column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);

-- Update handle_new_user function to include location field
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
    department,
    title,
    location,
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
    NULL,
    NULL,
    NULL,
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