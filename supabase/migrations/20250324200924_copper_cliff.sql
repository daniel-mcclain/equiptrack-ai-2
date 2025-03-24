/*
  # Add Part Purchases Table and Update Schema

  1. New Tables
    - `part_purchases`
      - Track part purchase history
      - Store supplier information
      - Track delivery status
      - Store attachments and warranty info

  2. Security
    - Enable RLS
    - Add policies for company-based access
*/

-- Create part_purchases table
CREATE TABLE IF NOT EXISTS part_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts_inventory(id),
  supplier text NOT NULL,
  purchase_date date NOT NULL,
  purchase_price decimal(10,2) NOT NULL,
  quantity integer NOT NULL,
  unit_of_measurement text NOT NULL,
  order_number text NOT NULL,
  delivery_status text NOT NULL,
  expected_delivery_date date,
  storage_location text NOT NULL,
  quality_notes text,
  warranty_info text,
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraint for delivery status
ALTER TABLE part_purchases
  ADD CONSTRAINT valid_delivery_status
  CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'delayed'));

-- Enable RLS
ALTER TABLE part_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read company part purchases"
  ON part_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = part_purchases.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company part purchases"
  ON part_purchases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = part_purchases.company_id
      AND user_companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = part_purchases.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_part_purchases_company_id ON part_purchases(company_id);
CREATE INDEX idx_part_purchases_part_id ON part_purchases(part_id);
CREATE INDEX idx_part_purchases_delivery_status ON part_purchases(delivery_status);
CREATE INDEX idx_part_purchases_purchase_date ON part_purchases(purchase_date);

-- Add helper function to check if a part has any purchases
CREATE OR REPLACE FUNCTION has_part_purchases(part_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM part_purchases
    WHERE part_id = part_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;