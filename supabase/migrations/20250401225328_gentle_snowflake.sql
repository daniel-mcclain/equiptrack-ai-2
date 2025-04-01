/*
  # Add Admin User Validation Logic

  1. Changes
    - Add validation to create_admin_user_rpc function
    - Check if user is already an admin before proceeding
    - Check if company already has an admin user
    - Protect is_global_admin field from modification
    - Add audit logging for admin creation attempts

  2. Security
    - Prevent unnecessary admin user creation
    - Protect global admin status
    - Log all admin creation attempts
*/

-- Create function to check if a company already has an admin
CREATE OR REPLACE FUNCTION company_has_admin(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN user_companies uc ON u.id = uc.user_id
    WHERE uc.company_id = company_uuid
    AND uc.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if a user is already an admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN user_companies uc ON u.id = uc.user_id
    WHERE u.id = user_uuid
    AND uc.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update make_admin function with validation logic
CREATE OR REPLACE FUNCTION make_admin(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_email text;
  v_company_record companies%ROWTYPE;
  v_start_time timestamptz;
  v_error_message text;
  v_is_already_admin boolean;
  v_company_has_admin boolean;
  v_user_is_global_admin boolean;
BEGIN
  -- Record start time
  v_start_time := clock_timestamp();
  
  -- Log function start
  RAISE LOG 'make_admin started for user %', user_uuid;

  -- Check if user is already an admin
  v_is_already_admin := is_user_admin(user_uuid);
  
  IF v_is_already_admin THEN
    v_error_message := 'User is already an admin';
    RAISE LOG 'make_admin error: % for user %', v_error_message, user_uuid;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'already_admin', true
    );
  END IF;

  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = user_uuid;

  IF v_user_email IS NULL THEN
    v_error_message := 'User not found';
    RAISE LOG 'make_admin error: % for user %', v_error_message, user_uuid;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Find matching company
  SELECT * INTO v_company_record
  FROM companies
  WHERE contact_email = v_user_email;

  IF v_company_record IS NULL THEN
    v_error_message := 'No matching company found';
    RAISE LOG 'make_admin error: % for user % with email %', 
      v_error_message, 
      user_uuid, 
      v_user_email;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Check if company already has an admin
  v_company_has_admin := company_has_admin(v_company_record.id);
  
  IF v_company_has_admin THEN
    v_error_message := 'Company already has an admin user';
    RAISE LOG 'make_admin error: % for company %', v_error_message, v_company_record.id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'company_has_admin', true
    );
  END IF;

  -- Preserve global admin status
  SELECT is_global_admin INTO v_user_is_global_admin
  FROM users
  WHERE id = user_uuid;

  -- Log company match
  RAISE LOG 'make_admin found matching company % for user %', 
    v_company_record.id, 
    user_uuid;

  -- Create or update user record, preserving global admin status
  INSERT INTO users (
    id,
    first_name,
    last_name,
    email,
    role,
    status,
    company_id,
    language,
    theme,
    email_notifications,
    push_notifications,
    sms_notifications,
    profile_visibility,
    is_global_admin,
    created_at,
    updated_at
  ) 
  SELECT
    user_uuid,
    COALESCE(u.first_name, split_part(v_user_email, '@', 1)),
    COALESCE(u.last_name, 'Admin'),
    v_user_email,
    'admin',
    'active',
    v_company_record.id,
    COALESCE(u.language, 'en'),
    COALESCE(u.theme, 'system'),
    COALESCE(u.email_notifications, true),
    COALESCE(u.push_notifications, true),
    COALESCE(u.sms_notifications, false),
    COALESCE(u.profile_visibility, 'private'),
    COALESCE(v_user_is_global_admin, false), -- Preserve global admin status
    now(),
    now()
  FROM (SELECT * FROM users WHERE id = user_uuid) u
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    company_id = v_company_record.id,
    updated_at = now(),
    -- Explicitly preserve global admin status
    is_global_admin = COALESCE(v_user_is_global_admin, users.is_global_admin, false);

  RAISE LOG 'make_admin created/updated user record for user %', user_uuid;

  -- Ensure user_companies record exists
  INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    v_company_record.id,
    'admin',
    now(),
    now()
  )
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    role = 'admin',
    updated_at = now();

  RAISE LOG 'make_admin updated user_companies for user %', user_uuid;

  -- Setup admin permissions
  PERFORM setup_admin_permissions(user_uuid, v_company_record.id);

  RAISE LOG 'make_admin setup permissions completed for user %', user_uuid;

  -- Log admin creation
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    user_uuid,
    'MAKE_ADMIN',
    jsonb_build_object(
      'email', v_user_email,
      'company_id', v_company_record.id,
      'company_name', v_company_record.name,
      'start_time', v_start_time,
      'end_time', clock_timestamp(),
      'duration_ms', extract(milliseconds from clock_timestamp() - v_start_time),
      'preserved_global_admin', v_user_is_global_admin
    ),
    user_uuid
  );

  RAISE LOG 'make_admin completed successfully for user %', user_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', user_uuid,
    'company_id', v_company_record.id,
    'company_name', v_company_record.name,
    'role', 'admin',
    'preserved_global_admin', v_user_is_global_admin
  );
EXCEPTION
  WHEN others THEN
    v_error_message := SQLERRM;
    RAISE LOG 'make_admin unexpected error for user %: %', user_uuid, v_error_message;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update create_admin_user_rpc function with validation logic
CREATE OR REPLACE FUNCTION create_admin_user_rpc()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_result jsonb;
  v_error_message text;
  v_is_already_admin boolean;
  v_company_id uuid;
  v_company_has_admin boolean;
  v_user_email text;
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

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Check if user is already an admin
  v_is_already_admin := is_user_admin(v_user_id);
  
  IF v_is_already_admin THEN
    v_error_message := 'User is already an admin';
    RAISE LOG 'create_admin_user_rpc: % for user %', v_error_message, v_user_id;
    
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
        'already_admin', true,
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'already_admin', true
    );
  END IF;

  -- Find company ID for this user
  SELECT id INTO v_company_id
  FROM companies
  WHERE contact_email = v_user_email;
  
  IF v_company_id IS NULL THEN
    v_error_message := 'No matching company found for user';
    RAISE LOG 'create_admin_user_rpc: % for user %', v_error_message, v_user_id;
    
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
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Check if company already has an admin
  v_company_has_admin := company_has_admin(v_company_id);
  
  IF v_company_has_admin THEN
    v_error_message := 'Company already has an admin user';
    RAISE LOG 'create_admin_user_rpc: % for company %', v_error_message, v_company_id;
    
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
        'company_has_admin', true,
        'company_id', v_company_id,
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'company_has_admin', true
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
        'can_be_admin_check', false,
        'email', v_user_email
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
      'result', v_result,
      'email', v_user_email,
      'company_id', v_company_id
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
        'error_detail', SQLSTATE,
        'email', v_user_email
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

-- Drop existing functions to avoid return type errors
DROP FUNCTION IF EXISTS get_available_companies();
DROP FUNCTION IF EXISTS update_selected_company(uuid);

-- Create a function to get available companies for global admins
CREATE OR REPLACE FUNCTION get_available_companies()
RETURNS TABLE (
  id uuid,
  name text,
  industry text,
  fleet_size integer,
  contact_name text,
  contact_email text
) AS $$
BEGIN
  -- Check if user is global admin
  IF NOT is_global_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  -- Return all companies
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.industry,
    c.fleet_size,
    c.contact_name,
    c.contact_email
  FROM companies c
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update selected company for global admin
CREATE OR REPLACE FUNCTION update_selected_company(company_uuid uuid)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is global admin
  IF NOT is_global_admin(v_user_id) THEN
    RETURN false;
  END IF;
  
  -- Update selected company
  UPDATE users
  SET 
    selected_company_id = company_uuid,
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Log company switch
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_user_id,
    'SWITCH_COMPANY',
    jsonb_build_object(
      'company_id', company_uuid,
      'timestamp', now()
    ),
    v_user_id
  );
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;