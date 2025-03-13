/*
  # User Permissions Schema

  1. New Tables
    - `user_roles`
      - Maps users to roles within a company
      - Stores role assignments with metadata
    - `role_permissions`
      - Maps roles to specific permissions
      - Stores granular access controls

  2. Security
    - Enable RLS on all tables
    - Add policies for role and permission management
    - Only company owners can manage roles and permissions

  3. Changes
    - Add role and permission tracking
    - Support for company-specific role customization
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, role, resource, action)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles

-- Company owners can read all user roles for their company
CREATE POLICY "Company owners can read user roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Company owners can assign roles
CREATE POLICY "Company owners can assign roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Company owners can update roles
CREATE POLICY "Company owners can update roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Company owners can delete roles
CREATE POLICY "Company owners can delete roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Policies for role_permissions

-- Company owners can read permissions
CREATE POLICY "Company owners can read permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Company owners can create permissions
CREATE POLICY "Company owners can create permissions"
  ON role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Company owners can update permissions
CREATE POLICY "Company owners can update permissions"
  ON role_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Company owners can delete permissions
CREATE POLICY "Company owners can delete permissions"
  ON role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_company_id ON user_roles(company_id);
CREATE INDEX idx_role_permissions_company_id ON role_permissions(company_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_resource ON role_permissions(resource);
CREATE INDEX idx_role_permissions_action ON role_permissions(action);

-- Insert default roles and permissions for existing companies
INSERT INTO user_roles (user_id, company_id, role)
SELECT 
  companies.owner_id,
  companies.id,
  'admin'
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = companies.owner_id
  AND user_roles.company_id = companies.id
);

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id uuid,
  p_company_id uuid,
  p_resource text,
  p_action text
) RETURNS boolean AS $$
BEGIN
  -- Company owners always have all permissions
  IF EXISTS (
    SELECT 1 FROM companies
    WHERE id = p_company_id
    AND owner_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check role-based permissions
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.company_id = rp.company_id AND ur.role = rp.role
    WHERE ur.user_id = p_user_id
    AND ur.company_id = p_company_id
    AND rp.resource = p_resource
    AND rp.action = p_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;