/*
  # Replace Operators with Work Orders

  1. Changes
    - Drop operators table and related tables
    - Create work_orders table with necessary fields
    - Add RLS policies for work orders
    - Add indexes for better performance

  2. Security
    - Enable RLS on work_orders table
    - Add policies for company-based access control
*/

-- Drop operators-related tables
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS operators;

-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  asset_type text NOT NULL,
  asset_id uuid NOT NULL,
  assigned_to uuid REFERENCES users(id),
  due_date timestamptz,
  completed_at timestamptz,
  estimated_hours decimal(10,2),
  actual_hours decimal(10,2),
  parts_cost decimal(10,2),
  labor_cost decimal(10,2),
  notes text,
  attachments text[],
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE work_orders
  ADD CONSTRAINT valid_work_order_status
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));

ALTER TABLE work_orders
  ADD CONSTRAINT valid_work_order_priority
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE work_orders
  ADD CONSTRAINT valid_work_order_type
  CHECK (type IN ('repair', 'maintenance', 'inspection', 'other'));

ALTER TABLE work_orders
  ADD CONSTRAINT valid_asset_type
  CHECK (asset_type IN ('vehicle', 'equipment'));

-- Enable RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read company work orders"
  ON work_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = work_orders.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create work orders"
  ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = work_orders.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update work orders"
  ON work_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = work_orders.company_id
      AND user_companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = work_orders.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete work orders"
  ON work_orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = work_orders.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);

-- Helper function to check if a user can manage work orders
CREATE OR REPLACE FUNCTION can_manage_work_orders(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE company_id = company_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get work order statistics
CREATE OR REPLACE FUNCTION get_work_order_stats(company_uuid uuid)
RETURNS TABLE (
  total_orders bigint,
  pending_orders bigint,
  in_progress_orders bigint,
  completed_orders bigint,
  overdue_orders bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE status != 'completed' AND due_date < now()) as overdue_orders
  FROM work_orders
  WHERE company_id = company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;