/*
  # Update User Policies for Company Access

  1. Changes
    - Add policies to allow company members to view other users in their company
    - Add helper function to check company membership
    - Update existing policies to include company context

  2. Security
    - Maintain existing RLS security model
    - Add company-based access control
*/

-- Drop existing policies that we'll replace
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Helper function to check if users are in the same company
CREATE OR REPLACE FUNCTION users_in_same_company(user_a uuid, user_b uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id IN (user_a, user_b)
    GROUP BY company_id
    HAVING COUNT(*) = 2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for reading user data
CREATE POLICY "Users can read company users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    auth.uid() = id
    OR
    -- Users can read data of users in the same company
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = users.company_id
    )
  );

-- Policy for updating user data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add index for company lookups
CREATE INDEX IF NOT EXISTS idx_users_company_lookup 
  ON users(company_id, id);