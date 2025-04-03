/*
  # Create get_available_companies function

  1. New Functions
    - `get_available_companies` - Function to get companies available to the current user
  
  2. Security
    - Function is accessible to authenticated users
    - Returns different results based on user's global admin status
*/

-- Function to get companies available to the current user
CREATE OR REPLACE FUNCTION get_available_companies()
RETURNS SETOF companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_global_admin BOOLEAN;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is a global admin
  SELECT is_global_admin INTO v_is_global_admin
  FROM users
  WHERE id = v_user_id;
  
  -- If user is a global admin, return all companies
  IF v_is_global_admin THEN
    RETURN QUERY
    SELECT c.*
    FROM companies c
    ORDER BY c.name;
  ELSE
    -- For regular users, return only companies they have access to
    RETURN QUERY
    SELECT c.*
    FROM companies c
    JOIN user_companies uc ON c.id = uc.company_id
    WHERE uc.user_id = v_user_id
    ORDER BY c.name;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_available_companies() TO authenticated;