/*
  # Update Subscription Tier Constraint

  1. Changes
    - Drop existing subscription tier constraint
    - Add updated constraint with correct values
    - Add helper function to validate subscription tiers

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Drop existing constraint
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS valid_subscription_tier;

-- Add updated constraint
ALTER TABLE companies
  ADD CONSTRAINT valid_subscription_tier
  CHECK (subscription_tier IN ('test_drive', 'starter', 'standard', 'professional'));

-- Create helper function to validate subscription tiers
CREATE OR REPLACE FUNCTION is_valid_subscription_tier(tier text)
RETURNS boolean AS $$
BEGIN
  RETURN tier IN ('test_drive', 'starter', 'standard', 'professional');
END;
$$ LANGUAGE plpgsql;