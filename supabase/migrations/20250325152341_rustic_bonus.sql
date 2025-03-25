/*
  # Create Admin User Functions

  1. Changes
    - Create RPC function for admin user creation
    - Create helper functions for admin management
    - Add proper error handling and validation

  2. Security
    - Maintain secure access control
    - Add proper validation
*/

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_uuid
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user can be admin
CREATE OR REPLACE FUNCTION can_be_admin(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = user_uuid;

  -- Check if email matches any company's contact email
  RETURN EXISTS (
    SELECT 1 FROM companies
    WHERE contact_email = v_user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to setup admin permissions
CREATE OR REPLACE FUNCTION setup_admin_permissions(
  admin_id uuid,
  company_uuid uuid
) RETURNS void AS $$
BEGIN
  -- Insert admin permissions
  INSERT INTO role_permissions (
    company_id,
    role,
    resource,
    action,
    created_at,
    updated_at
  )
  SELECT 
    company_uuid,
    'admin',
    r.resource,
    a.action,
    now(),
    now()
  FROM 
    (VALUES 
      ('users'),
      ('vehicles'),
      ('equipment'),
      ('maintenance'),
      ('work_orders'),
      ('parts_inventory'),
      ('reports'),
      ('settings')
    ) as r(resource)
    CROSS JOIN
    (VALUES 
      ('view'),
      ('create'),
      ('edit'),
      ('delete')
    ) as a(action)
  ON CONFLICT (company_id, role, resource, action) 
    DO UPDATE SET 
      updated_at = now();

  -- Log permission setup
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    admin_id,
    'SETUP_ADMIN_PERMISSIONS',
    jsonb_build_object(
      'company_id', company_uuid,
      'created_at', now()
    ),
    admin_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to make user an admin
CREATE OR REPLACE FUNCTION make_admin(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_email text;
  v_company_record companies%ROWTYPE;
BEGIN
  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = user_uuid;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Find matching company
  SELECT * INTO v_company_record
  FROM companies
  WHERE contact_email = v_user_email;

  IF v_company_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No matching company found'
    );
  END IF;

  -- Update user role
  UPDATE users
  SET 
    role = 'admin',
    company_id = v_company_record.id,
    updated_at = now()
  WHERE id = user_uuid;

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

  -- Setup admin permissions
  PERFORM setup_admin_permissions(user_uuid, v_company_record.id);

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
      'created_at', now()
    ),
    user_uuid
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', user_uuid,
    'company_id', v_company_record.id,
    'company_name', v_company_record.name,
    'role', 'admin'
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to check and create admin user
CREATE OR REPLACE FUNCTION create_admin_user_rpc()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No authenticated user found'
    );
  END IF;

  -- Check if user can be admin
  IF NOT can_be_admin(v_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User cannot be made admin'
    );
  END IF;

  -- Make user admin
  RETURN make_admin(v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;