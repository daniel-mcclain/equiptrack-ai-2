/*
  # Fix Users Table Email Access

  1. Changes
    - Add email column to users table
    - Update user creation trigger to include email
    - Add index for email lookups

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add email column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email text;

-- Update handle_new_user function to include email
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

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);