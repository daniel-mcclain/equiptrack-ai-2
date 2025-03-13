/*
  # Add User Management Support

  1. Changes
    - Add last_login column to users table
    - Add status column to users table
    - Add indexes for better query performance
    - Add audit logging for user management actions

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add new columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Create audit log table
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  performed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit logs
CREATE POLICY "Company owners can read audit logs"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN companies c ON c.id = u.company_id
      WHERE u.id = user_audit_logs.user_id
      AND c.owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at);

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

-- Create triggers for audit logging
CREATE TRIGGER user_audit_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_update
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_delete
  AFTER DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_management_action();

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