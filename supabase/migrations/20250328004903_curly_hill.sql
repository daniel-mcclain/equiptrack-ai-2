/*
  # Fix User Audit Logs for Direct Edits

  1. Changes
    - Add system user function for audit logging
    - Update user management trigger function
    - Add helper functions for audit logging

  2. Security
    - Maintain existing RLS policies
    - Ensure secure audit logging
*/

-- Create or replace the function to get or create system user
CREATE OR REPLACE FUNCTION get_system_user()
RETURNS uuid AS $$
DECLARE
  v_system_user_id uuid;
BEGIN
  -- Try to get current user first
  v_system_user_id := auth.uid();
  
  -- If no current user, get or create system user
  IF v_system_user_id IS NULL THEN
    -- Look for existing system user
    SELECT id INTO v_system_user_id
    FROM auth.users
    WHERE email = 'system@equiptrack.ai'
    LIMIT 1;
    
    -- If no system user exists, create one
    IF v_system_user_id IS NULL THEN
      INSERT INTO auth.users (
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data
      ) VALUES (
        'system@equiptrack.ai',
        crypt('system-user-password', gen_salt('bf')),
        now(),
        jsonb_build_object(
          'first_name', 'System',
          'last_name', 'User'
        )
      )
      RETURNING id INTO v_system_user_id;

      -- Create corresponding users record
      INSERT INTO users (
        id,
        first_name,
        last_name,
        email,
        role,
        status,
        is_global_admin
      ) VALUES (
        v_system_user_id,
        'System',
        'User',
        'system@equiptrack.ai',
        'system',
        'active',
        true
      );
    END IF;
  END IF;

  RETURN v_system_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user management trigger function
CREATE OR REPLACE FUNCTION log_user_management_action()
RETURNS trigger AS $$
DECLARE
  v_performed_by uuid;
BEGIN
  -- Get the user who performed the action (system user if no authenticated user)
  v_performed_by := get_system_user();

  -- Insert audit log
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
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object(
        'operation', 'DELETE',
        'old_data', row_to_json(OLD),
        'is_system_action', auth.uid() IS NULL
      )
      ELSE jsonb_build_object(
        'operation', TG_OP,
        'new_data', row_to_json(NEW),
        'old_data', CASE 
          WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
          ELSE NULL
        END,
        'is_system_action', auth.uid() IS NULL
      )
    END,
    v_performed_by
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the triggers to ensure they're up to date
DROP TRIGGER IF EXISTS user_audit_insert ON users;
DROP TRIGGER IF EXISTS user_audit_update ON users;
DROP TRIGGER IF EXISTS user_audit_delete ON users;

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

-- Add helper function to check if action is performed by system
CREATE OR REPLACE FUNCTION is_system_action()
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;