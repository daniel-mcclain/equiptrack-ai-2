-- Drop existing trigger and function
DROP TRIGGER IF EXISTS user_audit_update ON users;
DROP FUNCTION IF EXISTS log_user_management_action();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION log_user_management_action()
RETURNS trigger AS $$
DECLARE
  v_performed_by uuid;
  v_user_id uuid;
  v_details jsonb;
BEGIN
  -- Get the user who performed the action
  v_performed_by := COALESCE(auth.uid(), get_supabase_admin_user());
  
  -- Get the user ID based on operation type
  v_user_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.id
    ELSE NEW.id
  END;

  -- Build details object based on operation
  v_details := CASE
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
      'is_supabase_admin', auth.uid() IS NULL,
      'user_id', v_user_id -- Explicitly include user_id
    )
  END;

  -- Insert audit log
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_user_id,
    TG_OP,
    v_details,
    v_performed_by
  );

  -- For UPDATE operations, ensure we return NEW
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER user_audit_update
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_management_action();

-- Update RLS policies to ensure Supabase admin access
DROP POLICY IF EXISTS "Allow Supabase admin access" ON users;
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

-- Add helper function to validate user updates
CREATE OR REPLACE FUNCTION validate_user_update()
RETURNS trigger AS $$
BEGIN
  -- Ensure ID is preserved
  NEW.id := OLD.id;
  
  -- Update timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
DROP TRIGGER IF EXISTS validate_user_update_trigger ON users;
CREATE TRIGGER validate_user_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_update();