/*
  # Fix User Audit Logs Migration

  1. Changes
    - Make trigger creation idempotent
    - Add proper comments and documentation
    - Ensure all operations are safe to repeat

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
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

CREATE POLICY "Users can create audit logs"
  ON user_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to create audit logs if they are the performer
    auth.uid() = performed_by
    AND
    -- And they belong to the same company as the user being audited
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.company_id = u2.company_id
      WHERE u1.id = auth.uid()
      AND u2.id = user_id
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
BEGIN
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
    CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    auth.uid()
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