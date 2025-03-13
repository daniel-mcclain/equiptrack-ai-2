/*
  # Add company relationship to vehicles table

  1. Changes
    - Add company_id column to vehicles table
    - Add foreign key constraint to companies table
    - Add index for better query performance
    - Update RLS policies to restrict access by company

  2. Security
    - Modify RLS policies to ensure users can only access vehicles from their company
    - Add policies for CRUD operations based on company association
*/

-- Add company_id column
ALTER TABLE vehicles
  ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read vehicles" ON vehicles;

-- Create new RLS policies
CREATE POLICY "Users can read company vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company vehicles"
  ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Helper function to check if a user can manage vehicles for a company
CREATE OR REPLACE FUNCTION public.user_can_manage_vehicles(user_uuid uuid, company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = user_uuid
    AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;