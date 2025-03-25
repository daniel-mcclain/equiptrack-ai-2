/*
  # Fix User Management Permissions

  1. Changes
    - Update RLS policies for users table
    - Add policies for user management
    - Fix audit log permissions
    - Make policies more granular

  2. Security
    - Maintain secure access control
    - Allow proper user management
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Company members can read company users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Company owners can manage users" ON users;

-- Create new policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read company users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = users.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Company admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = users.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = users.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  );

-- Drop existing policies for user_audit_logs
DROP POLICY IF EXISTS "Company owners can read audit logs" ON user_audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON user_audit_logs;

-- Create new policies for user_audit_logs
CREATE POLICY "Users can read own audit logs"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Company admins can read audit logs"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role = 'admin'
      AND uc.company_id = (
        SELECT company_id FROM users WHERE id = user_audit_logs.user_id
      )
    )
  );

CREATE POLICY "Users can create audit logs"
  ON user_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = performed_by
    AND (
      -- User can log actions for themselves
      auth.uid() = user_id
      OR
      -- Admins can log actions for users in their company
      EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
        AND uc.role = 'admin'
        AND uc.company_id = (
          SELECT company_id FROM users WHERE id = user_audit_logs.user_id
        )
      )
    )
  );

-- Helper function to check if user can manage other users
CREATE OR REPLACE FUNCTION can_manage_users(manager_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = manager_id
    AND uc2.user_id = user_id
    AND uc1.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;