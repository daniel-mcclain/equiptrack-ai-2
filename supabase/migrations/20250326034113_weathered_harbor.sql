/*
  # Fix User Verifications RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Add new policies for user verification management
    - Add helper functions for verification handling

  2. Security
    - Enable proper access control for verifications
    - Add secure token handling
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow token verification" ON user_verifications;

-- Create new policies
CREATE POLICY "Users can create verifications"
  ON user_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can read verifications"
  ON user_verifications
  FOR SELECT
  TO authenticated
  USING (
    -- Allow admins/managers to view verifications for their company
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
      AND uc.company_id = (user_verifications.user_data->>'company_id')::uuid
    )
    OR
    -- Allow users to verify their own token
    auth.email() = email
  );

-- Create helper function to check verification permissions
CREATE OR REPLACE FUNCTION can_manage_verifications(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid()
    AND company_id = company_uuid
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired verifications
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM user_verifications
  WHERE expires_at < now()
  AND verified_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;