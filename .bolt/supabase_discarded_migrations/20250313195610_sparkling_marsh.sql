/*
  # Add Payment Attempts Table

  1. New Tables
    - payment_attempts
      - Stores payment transaction attempts
      - Includes payment intent details
      - Tracks customer and transaction metadata

  2. Security
    - Enable RLS
    - Add policies for company owners
*/

-- Create payment attempts table
CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text NOT NULL,
  customer_id text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy for reading payment attempts
CREATE POLICY "Company owners can read payment attempts"
  ON payment_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.stripe_customer_id = payment_attempts.customer_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_payment_attempts_payment_intent ON payment_attempts(payment_intent_id);
CREATE INDEX idx_payment_attempts_customer ON payment_attempts(customer_id);
CREATE INDEX idx_payment_attempts_created ON payment_attempts(created_at);
CREATE INDEX idx_payment_attempts_status ON payment_attempts(status);