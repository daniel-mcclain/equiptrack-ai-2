/*
  # Add Stripe Integration Fields

  1. Changes
    - Add Stripe-related columns to companies table:
      - stripe_customer_id (text)
      - stripe_subscription_id (text)
      - stripe_price_id (text)
      - current_period_end (timestamptz)
      - cancel_at_period_end (boolean)

  2. Security
    - Existing RLS policies remain unchanged
*/

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription ON companies(stripe_subscription_id);