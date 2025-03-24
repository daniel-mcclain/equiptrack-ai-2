/*
  # Add start_date column to users table

  1. Changes
    - Add start_date column to users table
    - Create index for better query performance
    - Update handle_new_user function to include start_date field

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add start_date column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS start_date date;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_start_date ON users(start_date);

-- Update handle_new_user function to include start_date field
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
    manager,
    notes,
    start_date,
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