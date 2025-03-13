/*
  # Fix Stripe Webhook Support Migration

  1. Changes
    - Add Stripe-related columns to companies table
    - Create subscription_events table
    - Add indexes for better query performance
    - Make policy creation idempotent

  2. Security
    - Enable RLS on new tables
    - Add policies for company owners
*/

-- Add Stripe columns to companies table if they don't exist
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- Create subscription events table
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Create policy for company owners to read events (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_events' 
    AND policyname = 'Company owners can read subscription events'
  ) THEN
    CREATE POLICY "Company owners can read subscription events"
      ON subscription_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM companies
          WHERE companies.id = subscription_events.company_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription ON companies(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_company ON subscription_events(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at);