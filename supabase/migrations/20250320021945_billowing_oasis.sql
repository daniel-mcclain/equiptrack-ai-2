/*
  # Add Stripe Customer ID to Companies Table

  1. Changes
    - Add stripe_customer_id column to companies table
    - Add index for better query performance
    - Add helper function to check if company has Stripe ID

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add stripe_customer_id column if it doesn't exist
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id 
  ON companies(stripe_customer_id);

-- Helper function to check if company has Stripe ID
CREATE OR REPLACE FUNCTION public.company_has_stripe_id(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND stripe_customer_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;