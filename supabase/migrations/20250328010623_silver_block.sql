-- Drop existing triggers first
DROP TRIGGER IF EXISTS user_audit_insert ON users;
DROP TRIGGER IF EXISTS user_audit_update ON users;
DROP TRIGGER IF EXISTS user_audit_delete ON users;
DROP TRIGGER IF EXISTS validate_user_update_trigger ON users;

-- Update the user management trigger function
CREATE OR REPLACE FUNCTION log_user_management_action()
RETURNS trigger AS $$
DECLARE
  v_performed_by uuid;
  v_user_id uuid;
  v_details jsonb;
BEGIN
  -- Skip audit logging for Supabase admin actions
  IF current_setting('role') = 'service_role' THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    RETURN NULL;
  END IF;

  -- Get the user who performed the action
  v_performed_by := COALESCE(auth.uid(), get_supabase_admin_user());
  
  -- Get the user ID based on operation type
  v_user_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.id
    ELSE COALESCE(NEW.id, OLD.id)
  END;

  -- Skip if user_id is null
  IF v_user_id IS NULL THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    RETURN NULL;
  END IF;

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
      'user_id', v_user_id
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

  -- Return appropriate value based on operation
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block the operation
    RAISE WARNING 'Error in log_user_management_action: %', SQLERRM;
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the validation function
CREATE OR REPLACE FUNCTION validate_user_update()
RETURNS trigger AS $$
BEGIN
  -- Skip validation for Supabase admin actions
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Ensure ID is preserved and not null
  IF NEW.id IS NULL THEN
    NEW.id := OLD.id;
  END IF;
  
  -- Update timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in validate_user_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers with proper error handling
CREATE TRIGGER user_audit_insert
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.id IS NOT NULL)
  EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_update
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.id IS NOT NULL)
  EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_delete
  AFTER DELETE ON users
  FOR EACH ROW
  WHEN (OLD.id IS NOT NULL)
  EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER validate_user_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_update();

-- Helper function to check if running as Supabase admin
CREATE OR REPLACE FUNCTION is_supabase_admin()
RETURNS boolean AS $$
BEGIN
  RETURN current_setting('role') = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;