/*
  # Fix Inventory Security Integration

  1. Changes
    - Make policy creation idempotent
    - Add inventory permissions safely
    - Update RLS policies without conflicts

  2. Security
    - Maintain existing RLS policies
    - Add granular inventory access control
*/

-- Function to check if inventory permissions exist
CREATE OR REPLACE FUNCTION has_inventory_permission(
  user_uuid uuid,
  company_uuid uuid,
  action text
) RETURNS boolean AS $$
BEGIN
  -- Company owners always have all permissions
  IF EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND owner_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check role-based permissions
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.company_id = rp.company_id AND ur.role = rp.role
    WHERE ur.user_id = user_uuid
    AND ur.company_id = company_uuid
    AND rp.resource = 'parts_inventory'
    AND rp.action = action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop old policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parts_inventory' 
    AND policyname IN (
      'Users can read company parts inventory',
      'Users can manage company parts inventory',
      'parts_inventory_read_policy',
      'parts_inventory_write_policy'
    )
  ) THEN
    DROP POLICY IF EXISTS "Users can read company parts inventory" ON parts_inventory;
    DROP POLICY IF EXISTS "Users can manage company parts inventory" ON parts_inventory;
    DROP POLICY IF EXISTS "parts_inventory_read_policy" ON parts_inventory;
    DROP POLICY IF EXISTS "parts_inventory_write_policy" ON parts_inventory;
  END IF;
END $$;

-- Create new policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parts_inventory' 
    AND policyname = 'parts_inventory_read_policy'
  ) THEN
    CREATE POLICY "parts_inventory_read_policy"
      ON parts_inventory
      FOR SELECT
      TO authenticated
      USING (has_inventory_permission(auth.uid(), company_id, 'view'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parts_inventory' 
    AND policyname = 'parts_inventory_write_policy'
  ) THEN
    CREATE POLICY "parts_inventory_write_policy"
      ON parts_inventory
      FOR ALL
      TO authenticated
      USING (has_inventory_permission(auth.uid(), company_id, 'edit'))
      WITH CHECK (has_inventory_permission(auth.uid(), company_id, 'edit'));
  END IF;
END $$;

-- Insert default inventory permissions for roles
INSERT INTO role_permissions (company_id, role, resource, action)
SELECT 
  c.id as company_id,
  r.role_name as role,
  'parts_inventory' as resource,
  a.action_name as action
FROM 
  companies c
  CROSS JOIN (
    VALUES 
      ('admin'),
      ('manager'),
      ('maintenance'),
      ('viewer')
  ) as r(role_name)
  CROSS JOIN (
    VALUES 
      ('view'),
      ('create'),
      ('edit'),
      ('delete')
  ) as a(action_name)
WHERE 
  -- Only add view permission for viewer role
  (r.role_name != 'viewer' OR (r.role_name = 'viewer' AND a.action_name = 'view'))
  -- Only add view and create for maintenance role
  AND (r.role_name != 'maintenance' OR (r.role_name = 'maintenance' AND a.action_name IN ('view', 'create')))
  -- Add all permissions for admin and manager
  AND (r.role_name IN ('admin', 'manager'))
  -- Don't duplicate existing permissions
  AND NOT EXISTS (
    SELECT 1 
    FROM role_permissions rp 
    WHERE rp.company_id = c.id 
    AND rp.role = r.role_name
    AND rp.resource = 'parts_inventory'
    AND rp.action = a.action_name
  );

-- Add helper function to check inventory access
CREATE OR REPLACE FUNCTION can_access_inventory(company_uuid uuid, required_action text)
RETURNS boolean AS $$
BEGIN
  RETURN has_inventory_permission(auth.uid(), company_uuid, required_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;