/*
  # Update permission functions

  1. Changes
     - Drop and recreate permission functions with CASCADE to handle dependencies
     - Fix parameter naming in has_permission function
     - Ensure proper grants to authenticated users
*/

-- Drop functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS has_permission(UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS has_inventory_permission(UUID, UUID, TEXT) CASCADE;

-- Function to check if a user has a specific permission
CREATE FUNCTION has_permission(
  user_uuid UUID,
  company_uuid UUID,
  resource TEXT,
  action TEXT
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
  WHERE id = user_uuid;
  
  -- Global admins have all permissions
  IF v_is_global_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's role for the company
  SELECT role INTO v_user_role
  FROM user_companies
  WHERE user_id = user_uuid AND company_id = company_uuid;
  
  -- If user has no role in the company, they have no permissions
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the user's role has the required permission
  SELECT EXISTS(
    SELECT 1
    FROM role_permissions
    WHERE company_id = company_uuid
      AND role = v_user_role
      AND resource = resource
      AND action = action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- Function to check if a user has inventory permissions
CREATE FUNCTION has_inventory_permission(
  user_uuid UUID,
  company_uuid UUID,
  action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN has_permission(user_uuid, company_uuid, 'parts_inventory', action);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_permission(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_inventory_permission(UUID, UUID, TEXT) TO authenticated;