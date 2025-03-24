/*
  # Remove Work Order Assignment Field

  1. Changes
    - Drop assigned_to column from work orders table
    - Drop related triggers and functions
    - Drop foreign key constraints

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS validate_technician_assignment_trigger ON work_orders;

-- Drop existing function
DROP FUNCTION IF EXISTS validate_technician_assignment();

-- Drop foreign key constraint
ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_assigned_to_fkey;

-- Drop assigned_to column
ALTER TABLE work_orders
  DROP COLUMN IF EXISTS assigned_to;

-- Drop index if it exists
DROP INDEX IF EXISTS idx_work_orders_assigned_to;