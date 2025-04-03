/*
  # Update global admin check functions

  1. Modified Functions
    - `is_global_admin` - Function to check if a user is a global admin
    - `is_supabase_admin` - Function to check if the current request is from Supabase
  
  2. Security
    - Functions are accessible to authenticated users
    - Used for permission checks throughout the application
*/

-- Instead of dropping the functions, we'll create or replace them with the same parameter names
-- This avoids the dependency issues with policies that use these functions

-- Function to check if a user is a global admin
CREATE OR REPLACE FUNCTION is_global_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_global_admin BOOLEAN;
BEGIN
  SELECT is_global_admin INTO v_is_global_admin
  FROM users
  WHERE id = user_uuid;
  
  RETURN COALESCE(v_is_global_admin, FALSE);
END;
$$;

-- Function to check if the current request is from Supabase
CREATE OR REPLACE FUNCTION is_supabase_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_global_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_supabase_admin() TO authenticated;