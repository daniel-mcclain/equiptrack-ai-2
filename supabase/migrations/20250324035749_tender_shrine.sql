/*
  # Fix User Management RLS Policies

  1. Changes
    - Add policy for company owners to manage users
    - Update existing policies to handle user creation
    - Add helper function to check company ownership

  2. Security
    - Maintain existing RLS security model
    - Add company-based access control for user management
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Company members can read company users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies with proper company management support
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Company members can read company users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = users.company_id
    )
  );

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add policy for company owners to manage users
CREATE POLICY "Company owners can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.owner_id = auth.uid()
      AND companies.id = users.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.owner_id = auth.uid()
      AND companies.id = users.company_id
    )
  );

-- Helper function to check if a user can manage company users
CREATE OR REPLACE FUNCTION can_manage_company_users(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;