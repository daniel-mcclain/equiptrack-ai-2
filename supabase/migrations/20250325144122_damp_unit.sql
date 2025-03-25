/*
  # Add Auto Company Linking for New Users

  1. Changes
    - Add domain matching function
    - Update handle_new_user function to check for company domain match
    - Add helper functions for domain extraction and validation
    - Add audit logging for automatic company linking

  2. Security
    - Maintain existing RLS policies
    - Ensure secure domain matching
*/

-- Function to extract domain from email
CREATE OR REPLACE FUNCTION extract_email_domain(email text)
RETURNS text AS $$
BEGIN
  RETURN lower(split_part(email, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find matching company by email domain
CREATE OR REPLACE FUNCTION find_company_by_email_domain(user_email text)
RETURNS uuid AS $$
DECLARE
  v_company_id uuid;
  v_user_domain text;
BEGIN
  -- Extract and clean the user's email domain
  v_user_domain := extract_email_domain(user_email);
  
  -- Find matching company based on contact email domain
  SELECT id INTO v_company_id
  FROM companies
  WHERE extract_email_domain(contact_email) = v_user_domain
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to include company matching
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_company_id uuid;
  v_role text;
BEGIN
  -- Extract first and last name from metadata with proper fallbacks
  v_first_name := COALESCE(
    (NEW.raw_user_meta_data->>'first_name'),
    split_part(NEW.email, '@', 1)
  );
  
  v_last_name := COALESCE(
    (NEW.raw_user_meta_data->>'last_name'),
    'User'
  );

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Find matching company by email domain
  v_company_id := find_company_by_email_domain(NEW.email);
  
  -- Set default role
  v_role := CASE 
    WHEN v_company_id IS NOT NULL THEN 'member'
    ELSE 'user'
  END;

  -- Insert into users table
  INSERT INTO public.users (
    id,
    first_name,
    last_name,
    email,
    role,
    status,
    language,
    theme,
    email_notifications,
    push_notifications,
    sms_notifications,
    profile_visibility,
    two_factor_enabled,
    department,
    title,
    location,
    manager,
    notes,
    start_date,
    company_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_first_name,
    v_last_name,
    NEW.email,
    v_role,
    'active',
    'en',
    'system',
    true,
    true,
    false,
    'private',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    CURRENT_DATE,
    v_company_id,
    now(),
    now()
  );

  -- If company match found, create user_companies entry
  IF v_company_id IS NOT NULL THEN
    INSERT INTO user_companies (
      user_id,
      company_id,
      role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_company_id,
      v_role,
      now(),
      now()
    );

    -- Log automatic company linking
    INSERT INTO user_audit_logs (
      user_id,
      action,
      details,
      performed_by
    ) VALUES (
      NEW.id,
      'AUTO_COMPANY_LINK',
      jsonb_build_object(
        'company_id', v_company_id,
        'email_domain', extract_email_domain(NEW.email),
        'role', v_role,
        'created_at', now()
      ),
      NEW.id
    );
  END IF;

  -- Log user creation
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    NEW.id,
    'CREATE_USER',
    jsonb_build_object(
      'email', NEW.email,
      'first_name', v_first_name,
      'last_name', v_last_name,
      'company_id', v_company_id,
      'role', v_role,
      'created_at', now()
    ),
    NEW.id
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    -- Return NEW to allow auth user creation even if profile creation fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a user should be auto-linked
CREATE OR REPLACE FUNCTION should_auto_link_user(user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies
    WHERE extract_email_domain(contact_email) = extract_email_domain(user_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;