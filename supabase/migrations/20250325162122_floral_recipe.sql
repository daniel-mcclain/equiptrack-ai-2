/*
  # Fix User Audit Logs Foreign Key Constraint

  1. Changes
    - Update user_audit_logs table to reference auth.users
    - Add deferrable constraints to allow audit logging during user creation
    - Update trigger functions to handle audit logging properly

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Drop existing user_audit_logs table
DROP TABLE IF EXISTS user_audit_logs;

-- Create user_audit_logs table with auth.users reference
CREATE TABLE user_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  action text NOT NULL,
  details jsonb,
  performed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_performed_by ON user_audit_logs(performed_by);

-- Create policies
CREATE POLICY "Company owners can read audit logs"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN companies c ON c.id = u.company_id
      WHERE u.id = user_audit_logs.performed_by
      AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create audit logs"
  ON user_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = performed_by
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Update handle_new_user function to handle audit logging properly
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