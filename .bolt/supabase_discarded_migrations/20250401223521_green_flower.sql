/*
  # Protect Global Admin Flag

  1. Changes
    - Add validation trigger to prevent unauthorized changes to is_global_admin
    - Add function to check if user is a Supabase admin
    - Add helper functions for global admin management

  2. Security
    - Prevent unauthorized elevation to global admin status
    - Ensure only Supabase admins can modify global admin flag
*/

-- Create function to check if current user is a Supabase admin
CREATE OR REPLACE FUNCTION is_supabase_admin()
RETURNS boolean AS $$
BEGIN
  -- Check if the request is coming from a service role or the dashboard
  RETURN (current_setting('request.jwt.claim.role', true) = 'service_role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if a user is a global admin
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

-- Create function to validate user updates
CREATE OR REPLACE FUNCTION validate_user_update()
RETURNS trigger AS $$
BEGIN
  -- Check if is_global_admin is being changed
  IF OLD.is_global_admin IS DISTINCT FROM NEW.is_global_admin THEN
    -- Only allow Supabase admins to change is_global_admin
    IF NOT is_supabase_admin() THEN
      RAISE EXCEPTION 'Only Supabase administrators can modify the global admin status';
    END IF;
  END IF;
  
  -- Update timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_user_update_trigger ON users;

-- Create trigger to validate user updates
CREATE TRIGGER validate_user_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_update();

-- Log audit entry for this security change
INSERT INTO admin_audit_logs (
  user_id,
  action,
  details,
  success,
  error_message
) VALUES (
  coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  'SECURITY_UPDATE',
  jsonb_build_object(
    'description', 'Added protection for is_global_admin field',
    'timestamp', now()
  ),
  true,
  null
);