/*
  # Fix make_admin function to create missing users

  1. Changes
    - Update make_admin function to create user record if missing
    - Add proper error handling and logging
    - Ensure proper order of operations

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Update make_admin function to handle missing users
CREATE OR REPLACE FUNCTION make_admin(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_email text;
  v_company_record companies%ROWTYPE;
  v_start_time timestamptz;
  v_error_message text;
  v_first_name text;
  v_last_name text;
  v_user_metadata jsonb;
BEGIN
  -- Record start time
  v_start_time := clock_timestamp();
  
  -- Log function start
  RAISE LOG 'make_admin started for user %', user_uuid;

  -- Get user's email and metadata from auth.users
  SELECT 
    email,
    raw_user_meta_data
  INTO 
    v_user_email,
    v_user_metadata
  FROM auth.users
  WHERE id = user_uuid;

  IF v_user_email IS NULL THEN
    v_error_message := 'User not found in auth system';
    RAISE LOG 'make_admin error: %', v_error_message;
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

  -- Log company match
  RAISE LOG 'make_admin found matching company % for user %', 
    v_company_record.id, 
    user_uuid;

  -- Extract names from metadata
  v_first_name := COALESCE(
    v_user_metadata->>'first_name',
    split_part(v_user_email, '@', 1)
  );
  
  v_last_name := COALESCE(
    v_user_metadata->>'last_name',
    'Admin'
  );

  -- Create or update user record
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
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    v_first_name,
    v_last_name,
    v_user_email,
    'admin',
    'active',
    v_company_record.id,
    'en',
    'system',
    true,
    true,
    false,
    'private',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    company_id = v_company_record.id,
    updated_at = now();

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
      'duration_ms', extract(milliseconds from clock_timestamp() - v_start_time)
    ),
    user_uuid
  );

  RAISE LOG 'make_admin completed successfully for user %', user_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', user_uuid,
    'company_id', v_company_record.id,
    'company_name', v_company_record.name,
    'role', 'admin'
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