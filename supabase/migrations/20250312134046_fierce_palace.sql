/*
  # Add subscription tracking to companies table

  1. Changes
    - Add subscription-related columns to companies table:
      - subscription_tier (text): test_drive, starter, standard, professional
      - subscription_start_date (timestamptz)
      - subscription_end_date (timestamptz)
      - max_vehicles (integer): limit based on subscription tier
      - is_trial (boolean): whether the company is on a trial
      - trial_ends_at (timestamptz): when the trial period ends

  2. Security
    - Existing RLS policies remain unchanged
*/

ALTER TABLE companies
  ADD COLUMN subscription_tier text NOT NULL DEFAULT 'test_drive',
  ADD COLUMN subscription_start_date timestamptz DEFAULT now(),
  ADD COLUMN subscription_end_date timestamptz,
  ADD COLUMN max_vehicles integer NOT NULL DEFAULT 3,
  ADD COLUMN is_trial boolean NOT NULL DEFAULT true,
  ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '30 days');

-- Add constraint to ensure subscription_tier is valid
ALTER TABLE companies
  ADD CONSTRAINT valid_subscription_tier
  CHECK (subscription_tier IN ('test_drive', 'starter', 'standard', 'professional'));

-- Add constraint to ensure max_vehicles matches subscription tier
CREATE OR REPLACE FUNCTION validate_max_vehicles()
RETURNS trigger AS $$
BEGIN
  NEW.max_vehicles := 
    CASE NEW.subscription_tier
      WHEN 'test_drive' THEN 3
      WHEN 'starter' THEN 10
      WHEN 'standard' THEN 50
      WHEN 'professional' THEN 250
      ELSE 3
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_vehicles
  BEFORE INSERT OR UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION validate_max_vehicles();

-- Helper function to check if a company has exceeded their vehicle limit
CREATE OR REPLACE FUNCTION public.company_has_vehicle_capacity(company_uuid uuid)
RETURNS boolean AS $$
DECLARE
  vehicle_count integer;
  max_allowed integer;
BEGIN
  -- Get the company's current vehicle count
  SELECT COUNT(*) INTO vehicle_count
  FROM vehicles
  WHERE company_id = company_uuid;

  -- Get the company's max allowed vehicles
  SELECT max_vehicles INTO max_allowed
  FROM companies
  WHERE id = company_uuid;

  RETURN vehicle_count < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;