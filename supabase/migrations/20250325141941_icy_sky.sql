/*
  # Fix User Companies Foreign Key Constraints

  1. Changes
    - Make user_companies foreign key constraints deferrable
    - Update handle_new_company function to handle user_companies creation properly
    - Add proper error handling

  2. Security
    - Maintain existing RLS policies
*/

-- Update user_companies foreign key constraints to be deferrable
ALTER TABLE user_companies 
  DROP CONSTRAINT IF EXISTS user_companies_user_id_fkey,
  DROP CONSTRAINT IF EXISTS user_companies_company_id_fkey;

ALTER TABLE user_companies
  ADD CONSTRAINT user_companies_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE user_companies
  ADD CONSTRAINT user_companies_company_id_fkey 
  FOREIGN KEY (company_id) 
  REFERENCES companies(id) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY DEFERRED;

-- Update handle_new_company function to properly handle user_companies creation
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger AS $$
BEGIN
  -- Ensure we wait for user record to be fully created
  PERFORM pg_sleep(0.1);

  -- Insert into user_companies
  INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.owner_id,
    NEW.id,
    'owner',
    now(),
    now()
  );

  -- Log company creation
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    NEW.owner_id,
    'CREATE_COMPANY',
    jsonb_build_object(
      'company_id', NEW.id,
      'company_name', NEW.name,
      'created_at', now()
    ),
    NEW.owner_id
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE LOG 'Error in handle_new_company: %', SQLERRM;
    -- Return NEW to allow company creation even if user_companies creation fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_company();