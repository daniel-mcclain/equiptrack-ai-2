/*
  # Create Admin User Functions

  1. Changes
    - Create separate functions for RPC and trigger
    - Add proper error handling and validation
    - Add helper functions for admin management

  2. Security
    - Maintain secure access control
    - Add proper validation
*/

-- Create RPC function for admin user creation
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_company_record companies%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No authenticated user found'
    );
  END IF;

  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Find company where contact email matches exactly
  SELECT * INTO v_company_record
  FROM companies
  WHERE contact_email = v_user_email;

  -- If no match found, exit
  IF v_company_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No matching company found'
    );
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    -- Update existing user to admin if needed
    UPDATE users
    SET 
      role = 'admin',
      company_id = v_company_record.id,
      updated_at = now()
    WHERE id = v_user_id
    AND (role != 'admin' OR company_id IS NULL);
  ELSE
    -- Get user details from auth
    WITH auth_user AS (
      SELECT 
        id,
        email,
        raw_user_meta_data->>'first_name' as first_name,
        raw_user_meta_data->>'last_name' as last_name
      FROM auth.users
      WHERE id = v_user_id
    )
    -- Create new admin user
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
    )
    SELECT
      id,
      COALESCE(first_name, split_part(email, '@', 1)),
      COALESCE(last_name, 'Admin'),
      email,
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
    FROM auth_user;
  END IF;

  -- Ensure user_companies record exists
  INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_company_record.id,
    'admin',
    now(),
    now()
  ) ON CONFLICT (user_id, company_id) 
    DO UPDATE SET 
      role = 'admin',
      updated_at = now();

  -- Set up admin permissions
  INSERT INTO role_permissions (
    company_id,
    role,
    resource,
    action,
    created_at,
    updated_at
  )
  SELECT 
    v_company_record.id,
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

  -- Log admin creation/update
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_user_id,
    'CREATE_ADMIN',
    jsonb_build_object(
      'email', v_user_email,
      'company_id', v_company_record.id,
      'company_name', v_company_record.name,
      'created_at', now()
    ),
    v_user_id
  );

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'company_id', v_company_record.id,
    'company_name', v_company_record.name,
    'role', 'admin'
  );
EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE LOG 'Error in create_admin_user: %', SQLERRM;
    -- Return error result
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for automatic admin creation
CREATE OR REPLACE FUNCTION process_admin_user()
RETURNS trigger AS $$
DECLARE
  v_company_record companies%ROWTYPE;
BEGIN
  -- Find company where contact email matches exactly
  SELECT * INTO v_company_record
  FROM companies
  WHERE contact_email = NEW.email;

  -- If match found, set up admin user
  IF v_company_record IS NOT NULL THEN
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
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Admin'),
      NEW.email,
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

    -- Create user_companies record
    INSERT INTO user_companies (
      user_id,
      company_id,
      role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_company_record.id,
      'admin',
      now(),
      now()
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
      role = 'admin',
      updated_at = now();

    -- Set up admin permissions
    INSERT INTO role_permissions (
      company_id,
      role,
      resource,
      action,
      created_at,
      updated_at
    )
    SELECT 
      v_company_record.id,
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

    -- Log admin creation
    INSERT INTO user_audit_logs (
      user_id,
      action,
      details,
      performed_by
    ) VALUES (
      NEW.id,
      'AUTO_ADMIN_CREATE',
      jsonb_build_object(
        'email', NEW.email,
        'company_id', v_company_record.id,
        'company_name', v_company_record.name,
        'created_at', now()
      ),
      NEW.id
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in process_admin_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_admin_check ON auth.users;

-- Create new trigger for admin processing
CREATE TRIGGER on_auth_user_admin_check
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION process_admin_user();