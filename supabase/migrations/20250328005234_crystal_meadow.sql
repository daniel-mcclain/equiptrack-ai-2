-- Create a special system user for Supabase operations
CREATE OR REPLACE FUNCTION get_supabase_admin_user()
RETURNS uuid AS $$
DECLARE
  v_admin_user_id uuid;
BEGIN
  -- Look for existing admin user
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'global_supabase_admin'
  LIMIT 1;
  
  -- If no admin user exists, create one
  IF v_admin_user_id IS NULL THEN
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data
    ) VALUES (
      'global_supabase_admin',
      crypt('supabase-admin-password', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'first_name', 'Global',
        'last_name', 'Admin'
      )
    )
    RETURNING id INTO v_admin_user_id;

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
      v_admin_user_id,
      'Global',
      'Admin',
      'global_supabase_admin',
      'admin',
      'active',
      true
    );
  END IF;

  RETURN v_admin_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user management trigger function
CREATE OR REPLACE FUNCTION log_user_management_action()
RETURNS trigger AS $$
DECLARE
  v_performed_by uuid;
BEGIN
  -- Get the user who performed the action
  -- If no authenticated user, use the Supabase admin user
  v_performed_by := COALESCE(auth.uid(), get_supabase_admin_user());

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
        'is_supabase_admin', auth.uid() IS NULL
      )
      ELSE jsonb_build_object(
        'operation', TG_OP,
        'new_data', row_to_json(NEW),
        'old_data', CASE 
          WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
          ELSE NULL
        END,
        'is_supabase_admin', auth.uid() IS NULL
      )
    END,
    v_performed_by
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the triggers
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

-- Add helper function to check if action is performed by Supabase admin
CREATE OR REPLACE FUNCTION is_supabase_admin()
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to allow Supabase admin access
CREATE POLICY "Allow Supabase admin access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    is_global_admin(auth.uid()) OR 
    is_supabase_admin() OR 
    id = auth.uid()
  )
  WITH CHECK (
    is_global_admin(auth.uid()) OR 
    is_supabase_admin() OR 
    id = auth.uid()
  );

-- Update user audit logs policies
CREATE POLICY "Allow Supabase admin to create audit logs"
  ON user_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = performed_by OR
    is_supabase_admin()
  );