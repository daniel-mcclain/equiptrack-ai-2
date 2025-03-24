/*
  # Fix Work Orders Technician Assignment

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key to technicians table
    - Add validation trigger for technician assignments
    - Add helper functions for technician validation

  2. Security
    - Maintain existing RLS policies
    - Add proper validation for technician assignments
*/

-- Drop existing foreign key if it exists
ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_assigned_to_fkey;

-- Add foreign key to technicians table
ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES technicians(id);

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