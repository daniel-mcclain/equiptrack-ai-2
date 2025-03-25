/*
  # Fix Admin Audit Logs Foreign Key Issue

  1. Changes
    - Update admin_audit_logs to reference auth.users instead of users table
    - Update RLS policies to handle auth.users relationship
    - Update functions to handle proper order of operations

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Drop existing table and recreate with correct foreign key
DROP TABLE IF EXISTS admin_audit_logs;

CREATE TABLE admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb NOT NULL,
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin audit logs
CREATE POLICY "Company owners can read admin audit logs"
  ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN companies c ON c.id = u.company_id
      WHERE u.id = admin_audit_logs.user_id
      AND c.owner_id = auth.uid()
    )
  );

-- Update create_admin_user_rpc function
CREATE OR REPLACE FUNCTION create_admin_user_rpc()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_result jsonb;
  v_error_message text;
BEGIN
  -- Record start time
  v_start_time := clock_timestamp();
  
  -- Get current user
  v_user_id := auth.uid();
  
  -- Log function start
  RAISE LOG 'create_admin_user_rpc started for user %', v_user_id;
  
  IF v_user_id IS NULL THEN
    v_error_message := 'No authenticated user found';
    RAISE LOG 'create_admin_user_rpc error: %', v_error_message;
    
    -- Log attempt in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp()
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Check if user can be admin
  IF NOT can_be_admin(v_user_id) THEN
    v_error_message := 'User cannot be made admin';
    RAISE LOG 'create_admin_user_rpc error: % for user %', v_error_message, v_user_id;
    
    -- Log attempt in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp(),
        'can_be_admin_check', false
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Make user admin and get result
  v_result := make_admin(v_user_id);
  v_end_time := clock_timestamp();
  
  -- Log completion
  RAISE LOG 'create_admin_user_rpc completed for user % with result: %', 
    v_user_id, 
    v_result;

  -- Log attempt in admin audit
  INSERT INTO admin_audit_logs (
    user_id,
    action,
    details,
    success,
    error_message
  ) VALUES (
    v_user_id,
    'CREATE_ADMIN_RPC',
    jsonb_build_object(
      'start_time', v_start_time,
      'end_time', v_end_time,
      'duration_ms', extract(milliseconds from v_end_time - v_start_time),
      'result', v_result
    ),
    (v_result->>'success')::boolean,
    v_result->>'error'
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    v_error_message := SQLERRM;
    RAISE LOG 'create_admin_user_rpc unexpected error for user %: %', v_user_id, v_error_message;
    
    -- Log error in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp(),
        'error_detail', SQLSTATE
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_admin_audit_logs function
CREATE OR REPLACE FUNCTION get_admin_audit_logs(
  company_uuid uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE (
  user_id uuid,
  email text,
  action text,
  details jsonb,
  success boolean,
  error_message text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.user_id,
    au.email,
    aal.action,
    aal.details,
    aal.success,
    aal.error_message,
    aal.created_at
  FROM admin_audit_logs aal
  JOIN auth.users au ON au.id = aal.user_id
  JOIN users u ON u.id = aal.user_id
  WHERE u.company_id = company_uuid
  AND aal.created_at >= now() - (days_back || ' days')::interval
  ORDER BY aal.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;