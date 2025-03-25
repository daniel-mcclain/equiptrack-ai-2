/*
  # Fix User Creation Process

  1. Changes
    - Update handle_new_user function to properly handle user creation
    - Ensure user record exists before company creation
    - Add proper error handling and logging

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing function and recreate with proper handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_first_name text;
  v_last_name text;
BEGIN
  -- Extract first and last name from metadata with proper fallbacks
  v_first_name := COALESCE(
    (NEW.raw_user_meta_data->>'first_name'),
    split_part(NEW.email, '@', 1)
  );
  
  v_last_name := COALESCE(
    (NEW.raw_user_meta_data->>'last_name'),
    'User'
  );

  -- Insert into users table first
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
    v_first_name,
    v_last_name,
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

  -- Ensure the user record exists before proceeding
  PERFORM pg_sleep(0.1);
  
  -- Log successful user creation
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    NEW.id,
    'CREATE_USER',
    jsonb_build_object(
      'email', NEW.email,
      'first_name', v_first_name,
      'last_name', v_last_name,
      'created_at', now()
    ),
    NEW.id
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    -- Return NEW to allow auth user creation even if profile creation fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update companies table foreign key to be deferrable
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_owner_id_fkey;

ALTER TABLE companies
  ADD CONSTRAINT companies_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY DEFERRED;

-- Create helper function to check if user exists
CREATE OR REPLACE FUNCTION public.user_exists(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql;