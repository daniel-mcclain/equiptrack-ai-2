/*
  # Fix User Policies to Prevent Recursion

  1. Changes
    - Drop existing recursive policies
    - Create new policies with optimized conditions
    - Add company-based access control without recursion

  2. Security
    - Maintain existing security model
    - Prevent infinite recursion in policy checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read company users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new optimized policies
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

-- Drop unused function
DROP FUNCTION IF EXISTS users_in_same_company;

-- Create optimized function for company membership check
CREATE OR REPLACE FUNCTION check_company_membership(user_uuid uuid, company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = user_uuid
    AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;