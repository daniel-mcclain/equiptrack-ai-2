/*
  # Add Global Admin Support

  1. Changes
    - Add is_global_admin column to users table
    - Add selected_company_id column to users table
    - Update RLS policies to support global admin access
    - Add helper functions for global admin management

  2. Security
    - Maintain existing RLS policies
    - Add global admin access control
*/

-- Add global admin columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_global_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS selected_company_id uuid REFERENCES companies(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_global_admin ON users(is_global_admin);
CREATE INDEX IF NOT EXISTS idx_users_selected_company ON users(selected_company_id);

-- Helper function to check if user is global admin
CREATE OR REPLACE FUNCTION is_global_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_uuid
    AND is_global_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has access to company
CREATE OR REPLACE FUNCTION has_company_access(user_uuid uuid, company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user is global admin
  IF is_global_admin(user_uuid) THEN
    RETURN true;
  END IF;

  -- Check if user belongs to company
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = user_uuid
    AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include global admin access

-- Users table
CREATE POLICY "Global admins can access all users"
  ON users
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- Companies table
CREATE POLICY "Global admins can access all companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- Vehicles table
CREATE POLICY "Global admins can access all vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- Work orders table
CREATE POLICY "Global admins can access all work orders"
  ON work_orders
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- Parts inventory table
CREATE POLICY "Global admins can access all parts inventory"
  ON parts_inventory
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- Technicians table
CREATE POLICY "Global admins can access all technicians"
  ON technicians
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- Create function to update selected company
CREATE OR REPLACE FUNCTION update_selected_company(company_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is global admin
  IF NOT is_global_admin(v_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only global admins can switch companies'
    );
  END IF;

  -- Check if company exists
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = company_uuid) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Company not found'
    );
  END IF;

  -- Update selected company
  UPDATE users
  SET 
    selected_company_id = company_uuid,
    updated_at = now()
  WHERE id = v_user_id;

  -- Log company switch
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_user_id,
    'SWITCH_COMPANY',
    jsonb_build_object(
      'company_id', company_uuid,
      'timestamp', now()
    ),
    v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'company_id', company_uuid
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get available companies for global admin
CREATE OR REPLACE FUNCTION get_available_companies()
RETURNS TABLE (
  id uuid,
  name text,
  industry text,
  contact_name text,
  contact_email text,
  subscription_tier text,
  is_trial boolean,
  created_at timestamptz
) AS $$
BEGIN
  -- Check if user is global admin
  IF NOT is_global_admin(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.industry,
    c.contact_name,
    c.contact_email,
    c.subscription_tier,
    c.is_trial,
    c.created_at
  FROM companies c
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;