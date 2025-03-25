/*
  # Fix User Creation on Login

  1. Changes
    - Add explicit transaction handling
    - Add retry logic for user creation
    - Add additional logging for debugging
    - Ensure proper order of operations

  2. Security
    - Maintain existing RLS policies
    - Ensure secure user creation
*/

-- Update handle_new_user function with improved error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_company_id uuid;
  v_role text;
  v_retry_count integer := 0;
  v_max_retries constant integer := 3;
  v_success boolean := false;
BEGIN
  -- Log function entry
  RAISE LOG 'handle_new_user started for user %', NEW.id;

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
    RAISE LOG 'User % already exists in users table', NEW.id;
    RETURN NEW;
  END IF;

  -- Find matching company by email domain
  v_company_id := find_company_by_email_domain(NEW.email);
  
  -- Set default role
  v_role := CASE 
    WHEN v_company_id IS NOT NULL THEN 'member'
    ELSE 'user'
  END;

  -- Retry loop for user creation
  WHILE v_retry_count < v_max_retries AND NOT v_success LOOP
    BEGIN
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

      -- If we get here, the insert was successful
      v_success := true;
      RAISE LOG 'Successfully created user record for %', NEW.id;

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

        RAISE LOG 'Successfully linked user % to company %', NEW.id, v_company_id;

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
          'created_at', now(),
          'retry_count', v_retry_count
        ),
        NEW.id
      );

    EXCEPTION
      WHEN unique_violation THEN
        -- Another process may have created the user, check if it exists
        IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
          RAISE LOG 'User % was created by another process', NEW.id;
          v_success := true;
        ELSE
          -- If user doesn't exist, retry
          v_retry_count := v_retry_count + 1;
          RAISE LOG 'Retry % for user %', v_retry_count, NEW.id;
          PERFORM pg_sleep(0.1 * v_retry_count); -- Exponential backoff
        END IF;
      WHEN OTHERS THEN
        -- Log other errors and retry
        RAISE LOG 'Error creating user %: %', NEW.id, SQLERRM;
        v_retry_count := v_retry_count + 1;
        PERFORM pg_sleep(0.1 * v_retry_count);
    END;
  END LOOP;

  -- Log final status
  IF NOT v_success THEN
    RAISE LOG 'Failed to create user % after % retries', NEW.id, v_max_retries;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helper function to check user creation status
CREATE OR REPLACE FUNCTION check_user_creation_status(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_exists', EXISTS (SELECT 1 FROM users WHERE id = user_uuid),
    'has_company', EXISTS (SELECT 1 FROM user_companies WHERE user_id = user_uuid),
    'latest_audit', (
      SELECT jsonb_build_object(
        'action', action,
        'details', details,
        'created_at', created_at
      )
      FROM user_audit_logs
      WHERE user_id = user_uuid
      ORDER BY created_at DESC
      LIMIT 1
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;