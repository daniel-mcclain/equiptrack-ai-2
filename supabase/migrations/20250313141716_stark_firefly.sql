/*
  # Add Subscription Events Table

  1. New Tables
    - subscription_events
      - Stores subscription-related events and changes
      - Includes payment success/failure events
      - Maintains audit trail of subscription changes

  2. Security
    - Enable RLS
    - Add policies for company owners
*/

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

-- Create policy for company owners to read events
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

-- Create indexes for better query performance
CREATE INDEX idx_subscription_events_company ON subscription_events(company_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_created ON subscription_events(created_at);