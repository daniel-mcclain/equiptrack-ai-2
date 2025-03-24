/*
  # Work Order Management System

  1. New Tables
    - `work_order_notes`
      - Timestamped notes for work orders
      - Note categories and technician tracking
    - `work_order_parts`
      - Parts used in work orders
      - Cost tracking and inventory management
    - `work_order_labor`
      - Labor tracking for technicians
      - Time and cost calculations
    - `parts_inventory`
      - Parts catalog and stock management

  2. Security
    - Enable RLS on all tables
    - Add policies for company-based access
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_work_order_stats(uuid);

-- Create parts inventory table
CREATE TABLE IF NOT EXISTS parts_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  description text NOT NULL,
  unit_cost decimal(10,2) NOT NULL,
  quantity_in_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 0,
  category text,
  manufacturer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, part_number)
);

-- Create work order notes table
CREATE TABLE IF NOT EXISTS work_order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES technicians(id),
  category text NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work order parts table
CREATE TABLE IF NOT EXISTS work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts_inventory(id),
  quantity integer NOT NULL,
  unit_cost decimal(10,2) NOT NULL,
  total_cost decimal(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work order labor table
CREATE TABLE IF NOT EXISTS work_order_labor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES technicians(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  break_minutes integer DEFAULT 0,
  hourly_rate decimal(10,2) NOT NULL,
  is_overtime boolean DEFAULT false,
  total_hours decimal(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN ROUND(CAST(
        EXTRACT(EPOCH FROM (end_time - start_time))/3600 - (break_minutes/60.0)
      AS numeric), 2)
      ELSE 0
    END
  ) STORED,
  total_cost decimal(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN ROUND(
        (EXTRACT(EPOCH FROM (end_time - start_time))/3600 - (break_minutes/60.0)) * 
        CASE WHEN is_overtime THEN hourly_rate * 1.5 ELSE hourly_rate END
      , 2)
      ELSE 0
    END
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE work_order_notes
  ADD CONSTRAINT valid_note_category
  CHECK (category IN ('diagnostic', 'repair', 'customer_communication', 'internal', 'quality_check'));

-- Enable RLS
ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_labor ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_parts_inventory_company ON parts_inventory(company_id);
CREATE INDEX idx_parts_inventory_part_number ON parts_inventory(part_number);
CREATE INDEX idx_work_order_notes_work_order ON work_order_notes(work_order_id);
CREATE INDEX idx_work_order_notes_technician ON work_order_notes(technician_id);
CREATE INDEX idx_work_order_notes_category ON work_order_notes(category);
CREATE INDEX idx_work_order_parts_work_order ON work_order_parts(work_order_id);
CREATE INDEX idx_work_order_parts_part ON work_order_parts(part_id);
CREATE INDEX idx_work_order_labor_work_order ON work_order_labor(work_order_id);
CREATE INDEX idx_work_order_labor_technician ON work_order_labor(technician_id);
CREATE INDEX idx_work_order_labor_start_time ON work_order_labor(start_time);
CREATE INDEX idx_work_order_labor_end_time ON work_order_labor(end_time);

-- Create policies for parts_inventory
CREATE POLICY "Users can read company parts inventory"
  ON parts_inventory
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = parts_inventory.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company parts inventory"
  ON parts_inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = parts_inventory.company_id
      AND user_companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = parts_inventory.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Create policies for work_order_notes
CREATE POLICY "Users can read work order notes"
  ON work_order_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      JOIN user_companies uc ON uc.company_id = wo.company_id
      WHERE wo.id = work_order_notes.work_order_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage their notes"
  ON work_order_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = work_order_notes.technician_id
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = work_order_notes.technician_id
      AND t.user_id = auth.uid()
    )
  );

-- Create policies for work_order_parts
CREATE POLICY "Users can read work order parts"
  ON work_order_parts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      JOIN user_companies uc ON uc.company_id = wo.company_id
      WHERE wo.id = work_order_parts.work_order_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage work order parts"
  ON work_order_parts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      JOIN technicians t ON t.company_id = wo.company_id
      WHERE wo.id = work_order_parts.work_order_id
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      JOIN technicians t ON t.company_id = wo.company_id
      WHERE wo.id = work_order_parts.work_order_id
      AND t.user_id = auth.uid()
    )
  );

-- Create policies for work_order_labor
CREATE POLICY "Users can read work order labor"
  ON work_order_labor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      JOIN user_companies uc ON uc.company_id = wo.company_id
      WHERE wo.id = work_order_labor.work_order_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can manage their labor entries"
  ON work_order_labor
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = work_order_labor.technician_id
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = work_order_labor.technician_id
      AND t.user_id = auth.uid()
    )
  );

-- Helper functions

-- Calculate total parts cost for a work order
CREATE OR REPLACE FUNCTION get_work_order_parts_cost(work_order_uuid uuid)
RETURNS decimal(10,2) AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM(total_cost)
      FROM work_order_parts
      WHERE work_order_id = work_order_uuid
    ),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate total labor cost for a work order
CREATE OR REPLACE FUNCTION get_work_order_labor_cost(work_order_uuid uuid)
RETURNS decimal(10,2) AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM(total_cost)
      FROM work_order_labor
      WHERE work_order_id = work_order_uuid
      AND end_time IS NOT NULL
    ),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate total cost for a work order
CREATE OR REPLACE FUNCTION get_work_order_total_cost(work_order_uuid uuid)
RETURNS decimal(10,2) AS $$
BEGIN
  RETURN (
    SELECT 
      get_work_order_parts_cost(work_order_uuid) +
      get_work_order_labor_cost(work_order_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update work order costs
CREATE OR REPLACE FUNCTION update_work_order_costs()
RETURNS trigger AS $$
BEGIN
  UPDATE work_orders
  SET
    parts_cost = get_work_order_parts_cost(NEW.work_order_id),
    labor_cost = get_work_order_labor_cost(NEW.work_order_id),
    updated_at = now()
  WHERE id = NEW.work_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update work order costs
CREATE TRIGGER update_work_order_parts_cost
  AFTER INSERT OR UPDATE OR DELETE ON work_order_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_work_order_costs();

CREATE TRIGGER update_work_order_labor_cost
  AFTER INSERT OR UPDATE OR DELETE ON work_order_labor
  FOR EACH ROW
  EXECUTE FUNCTION update_work_order_costs();

-- Function to check if a technician can work on a work order
CREATE OR REPLACE FUNCTION can_work_on_work_order(technician_uuid uuid, work_order_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN technicians t ON t.company_id = wo.company_id
    WHERE wo.id = work_order_uuid
    AND t.id = technician_uuid
    AND t.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get work order statistics
CREATE OR REPLACE FUNCTION get_work_order_stats(company_uuid uuid)
RETURNS TABLE (
  total_work_orders bigint,
  pending_work_orders bigint,
  in_progress_work_orders bigint,
  completed_work_orders bigint,
  total_parts_cost decimal(10,2),
  total_labor_cost decimal(10,2),
  avg_completion_time decimal(10,2),
  overdue_work_orders bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_work_orders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_work_orders,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_work_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_work_orders,
    COALESCE(SUM(parts_cost), 0) as total_parts_cost,
    COALESCE(SUM(labor_cost), 0) as total_labor_cost,
    AVG(
      EXTRACT(EPOCH FROM (completed_at - created_at))/3600
    ) FILTER (WHERE status = 'completed') as avg_completion_time,
    COUNT(*) FILTER (WHERE status != 'completed' AND due_date < now()) as overdue_work_orders
  FROM work_orders
  WHERE company_id = company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;