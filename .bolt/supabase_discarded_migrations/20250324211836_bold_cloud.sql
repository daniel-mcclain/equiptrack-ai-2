/*
  # Fix Work Orders Relationships

  1. Changes
    - Update work_orders table to properly reference technicians
    - Add helper functions for work order access control
    - Add indexes for better query performance

  2. Security
    - Maintain existing RLS policies
    - Add proper access control for relationships
*/

-- Drop existing foreign key if it exists
ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_assigned_to_fkey;

-- Add foreign key to technicians table
ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES technicians(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);

-- Create helper function to check if a technician can be assigned
CREATE OR REPLACE FUNCTION validate_technician_assignment()
RETURNS trigger AS $$
BEGIN
  -- Skip validation if assigned_to is NULL
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if technician exists and belongs to the same company
  IF NOT EXISTS (
    SELECT 1 FROM technicians
    WHERE id = NEW.assigned_to
    AND company_id = NEW.company_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid technician assignment. Technician must be active and belong to the same company.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate technician assignment
DROP TRIGGER IF EXISTS validate_technician_assignment_trigger ON work_orders;
CREATE TRIGGER validate_technician_assignment_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_technician_assignment();

-- Create helper function to check if a user has work order access
CREATE OR REPLACE FUNCTION has_work_order_access(work_order_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN user_companies uc ON uc.company_id = wo.company_id
    WHERE wo.id = work_order_uuid
    AND uc.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can create work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can update work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can delete work orders" ON work_orders;

CREATE POLICY "work_orders_read_policy"
  ON work_orders
  FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'view'));

CREATE POLICY "work_orders_insert_policy"
  ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(auth.uid(), company_id, 'work_orders', 'create'));

CREATE POLICY "work_orders_update_policy"
  ON work_orders
  FOR UPDATE
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'edit'))
  WITH CHECK (has_permission(auth.uid(), company_id, 'work_orders', 'edit'));

CREATE POLICY "work_orders_delete_policy"
  ON work_orders
  FOR DELETE
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'delete'));