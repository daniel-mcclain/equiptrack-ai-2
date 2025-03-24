/*
  # Fix Work Order Labor RLS Policies

  1. Changes
    - Drop existing RLS policies on work_order_labor table
    - Add new policies that properly handle:
      - Company-based access control
      - Technician self-management
      - Work order relationship checks

  2. Security
    - Ensure proper access control for labor entries
    - Allow technicians to manage their own entries
    - Allow company members to view labor entries
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Technicians can manage their labor entries" ON work_order_labor;
DROP POLICY IF EXISTS "Users can read work order labor" ON work_order_labor;
DROP POLICY IF EXISTS "Users can manage work order labor" ON work_order_labor;

-- Create new policies
CREATE POLICY "Users can read work order labor"
  ON work_order_labor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM work_orders wo
      JOIN user_companies uc ON uc.company_id = wo.company_id
      WHERE wo.id = work_order_labor.work_order_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage work order labor"
  ON work_order_labor
  FOR ALL
  TO authenticated
  USING (
    -- User must be either:
    -- 1. The technician assigned to the labor entry, or
    -- 2. A company member with appropriate access
    EXISTS (
      SELECT 1
      FROM technicians t
      JOIN work_orders wo ON wo.id = work_order_labor.work_order_id
      JOIN user_companies uc ON uc.company_id = wo.company_id
      WHERE t.id = work_order_labor.technician_id
      AND (
        t.user_id = auth.uid()
        OR (
          uc.user_id = auth.uid()
          AND uc.role IN ('admin', 'manager')
        )
      )
    )
  )
  WITH CHECK (
    -- Same conditions for insert/update
    EXISTS (
      SELECT 1
      FROM technicians t
      JOIN work_orders wo ON wo.id = work_order_labor.work_order_id
      JOIN user_companies uc ON uc.company_id = wo.company_id
      WHERE t.id = work_order_labor.technician_id
      AND (
        t.user_id = auth.uid()
        OR (
          uc.user_id = auth.uid()
          AND uc.role IN ('admin', 'manager')
        )
      )
    )
  );

-- Create helper function to check if user can manage labor entries
CREATE OR REPLACE FUNCTION can_manage_labor_entry(work_order_uuid uuid, technician_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM technicians t
    JOIN work_orders wo ON wo.id = work_order_uuid
    JOIN user_companies uc ON uc.company_id = wo.company_id
    WHERE t.id = technician_uuid
    AND (
      t.user_id = auth.uid()
      OR (
        uc.user_id = auth.uid()
        AND uc.role IN ('admin', 'manager')
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;