/*
  # Update permission check functions

  1. Modified Functions
    - `has_permission` - Function to check if a user has a specific permission
    - `has_inventory_permission` - Function to check if a user has inventory permissions
  
  2. Security
    - Functions are accessible to authenticated users
    - Used for permission checks throughout the application
*/

-- Instead of dropping the functions, we'll create or replace them
-- This avoids the dependency issues with policies that use these functions

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_global_admin BOOLEAN;
  v_user_role TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Check if user is a global admin
  SELECT is_global_admin INTO v_is_global_admin
  FROM users
  WHERE id = p_user_id;
  
  -- Global admins have all permissions
  IF v_is_global_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's role for the company
  SELECT role INTO v_user_role
  FROM user_companies
  WHERE user_id = p_user_id AND company_id = p_company_id;
  
  -- If user has no role in the company, they have no permissions
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the user's role has the required permission
  SELECT EXISTS(
    SELECT 1
    FROM role_permissions
    WHERE company_id = p_company_id
      AND role = v_user_role
      AND resource = p_resource
      AND action = p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- Function to check if a user has inventory permissions
CREATE OR REPLACE FUNCTION has_inventory_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN has_permission(p_user_id, p_company_id, 'parts_inventory', p_action);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_permission(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_inventory_permission(UUID, UUID, TEXT) TO authenticated;