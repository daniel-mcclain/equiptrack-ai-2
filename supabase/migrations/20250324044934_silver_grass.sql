/*
  # Fix User Audit Logs RLS Policies

  1. Changes
    - Update RLS policies to properly handle audit log creation
    - Simplify policy conditions for better maintainability
    - Ensure proper access control for audit logs

  2. Security
    - Maintain secure access control
    - Allow proper audit logging while preventing unauthorized access
*/

-- Add new columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Create audit log table
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  details jsonb,
  performed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company owners can read audit logs" ON user_audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON user_audit_logs;

-- Create updated policies for audit logs
CREATE POLICY "Company owners can read audit logs"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN companies c ON c.id = u.company_id
      WHERE u.id = user_audit_logs.performed_by
      AND c.owner_id = auth.uid()
    )
  );

-- Updated policy to allow audit log creation
CREATE POLICY "Users can create audit logs"
  ON user_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be authenticated and be the performer
    auth.uid() = performed_by
    AND
    -- User must exist and be active
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND status = 'active'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_performed_by ON user_audit_logs(performed_by);

-- Create function to log user management actions
CREATE OR REPLACE FUNCTION log_user_management_action()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_details jsonb;
BEGIN
  -- Get the current authenticated user
  SELECT auth.uid() INTO v_user_id;
  
  -- Build the details object
  v_details = CASE
    WHEN TG_OP = 'DELETE' THEN jsonb_build_object(
      'operation', 'DELETE',
      'old_data', row_to_json(OLD)
    )
    ELSE jsonb_build_object(
      'operation', TG_OP,
      'new_data', row_to_json(NEW)
    )
  END;

  -- Insert the audit log
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    v_details,
    v_user_id
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_audit_insert') THEN
    DROP TRIGGER user_audit_insert ON users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_audit_update') THEN
    DROP TRIGGER user_audit_update ON users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_audit_delete') THEN
    DROP TRIGGER user_audit_delete ON users;
  END IF;
END $$;

-- Create triggers for audit logging
CREATE TRIGGER user_audit_insert
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_update
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_delete
  AFTER DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_user_management_action();

-- Helper function to check if a user has management permissions
CREATE OR REPLACE FUNCTION can_manage_users(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;