/*
  # Create update_selected_company function

  1. New Functions
    - `update_selected_company` - Function to update a user's selected company
  
  2. Security
    - Function is accessible to authenticated users
    - Validates that the user has access to the specified company
*/

-- Function to update a user's selected company
CREATE OR REPLACE FUNCTION update_selected_company(company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN;
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
  
  -- If user is a global admin, they can access any company
  IF v_is_global_admin THEN
    -- Check if the company exists
    SELECT EXISTS(
      SELECT 1 FROM companies WHERE id = company_uuid
    ) INTO v_has_access;
  ELSE
    -- For regular users, check if they have access to the company
    SELECT EXISTS(
      SELECT 1 
      FROM user_companies 
      WHERE user_id = v_user_id AND company_id = company_uuid
    ) INTO v_has_access;
  END IF;
  
  -- If user doesn't have access to the company, raise an exception
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'User does not have access to this company';
  END IF;
  
  -- Update the user's selected company
  UPDATE users
  SET 
    selected_company_id = company_uuid,
    updated_at = now()
  WHERE id = v_user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_selected_company(UUID) TO authenticated;