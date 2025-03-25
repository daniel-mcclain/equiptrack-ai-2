/*
  # Add Admin User Creation Logic

  1. New Functions
    - create_admin_user: Creates admin user if email matches company contact
    - validate_admin_permissions: Sets up admin permissions
    - check_admin_status: Checks admin user creation status

  2. Security
    - Enable proper access control
    - Audit logging for admin creation
*/

-- Function to create admin user if email matches company contact
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS trigger AS $$
DECLARE
  v_company_record companies%ROWTYPE;
  v_user_id uuid;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Get current user
  SELECT current_setting('request.jwt.claim.sub', true) INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get user's email
  SELECT email INTO NEW.email
  FROM auth.users
  WHERE id = v_user_id;

  -- Find company where contact email matches exactly
  SELECT * INTO v_company_record
  FROM companies
  WHERE contact_email = NEW.email;

  -- If no match found, exit
  IF v_company_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract names from auth metadata or use defaults
  v_first_name := COALESCE(
    (NEW.raw_user_meta_data->>'first_name'),
    split_part(NEW.email, '@', 1)
  );
  
  v_last_name := COALESCE(
    (NEW.raw_user_meta_data->>'last_name'),
    'Admin'
  );

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
    ) VALUES (
      v_user_id,
      v_first_name,
      v_last_name,
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
    );
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

  -- Log admin creation
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_user_id,
    'CREATE_ADMIN',
    jsonb_build_object(
      'email', NEW.email,
      'company_id', v_company_record.id,
      'company_name', v_company_record.name,
      'created_at', now()
    ),
    v_user_id
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE LOG 'Error in create_admin_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for admin user creation
DROP TRIGGER IF EXISTS on_auth_user_admin_check ON auth.users;
CREATE TRIGGER on_auth_user_admin_check
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_admin_user();

-- Function to check admin status
CREATE OR REPLACE FUNCTION check_admin_status(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'is_admin', (role = 'admin'),
    'company_id', company_id,
    'company_name', (
      SELECT name 
      FROM companies 
      WHERE id = users.company_id
    ),
    'permissions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'resource', resource,
          'action', action
        )
      )
      FROM role_permissions
      WHERE company_id = users.company_id
      AND role = 'admin'
    ),
    'latest_audit', (
      SELECT jsonb_build_object(
        'action', action,
        'details', details,
        'created_at', created_at
      )
      FROM user_audit_logs
      WHERE user_id = user_uuid
      AND action = 'CREATE_ADMIN'
      ORDER BY created_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM users
  WHERE id = user_uuid;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate admin permissions
CREATE OR REPLACE FUNCTION validate_admin_permissions(company_uuid uuid)
RETURNS boolean AS $$
DECLARE
  v_missing_permissions boolean;
BEGIN
  -- Check if all required admin permissions exist
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT r.resource, a.action
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
    ) required_permissions
    WHERE NOT EXISTS (
      SELECT 1 
      FROM role_permissions
      WHERE company_id = company_uuid
      AND role = 'admin'
      AND resource = required_permissions.resource
      AND action = required_permissions.action
    )
  ) INTO v_missing_permissions;

  -- If missing permissions, create them
  IF v_missing_permissions THEN
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
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;