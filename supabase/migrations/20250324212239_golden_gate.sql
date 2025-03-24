/*
  # Fix Work Orders Policies

  1. Changes
    - Drop existing policies before creating new ones
    - Add role-based permission system
    - Update RLS policies to use permissions
    - Make migration idempotent

  2. Security
    - Maintain secure access control
    - Implement role-based security model
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'work_orders' 
    AND policyname IN (
      'work_orders_read_policy',
      'work_orders_insert_policy',
      'work_orders_update_policy',
      'work_orders_delete_policy'
    )
  ) THEN
    DROP POLICY IF EXISTS "work_orders_read_policy" ON work_orders;
    DROP POLICY IF EXISTS "work_orders_insert_policy" ON work_orders;
    DROP POLICY IF EXISTS "work_orders_update_policy" ON work_orders;
    DROP POLICY IF EXISTS "work_orders_delete_policy" ON work_orders;
  END IF;
END $$;

-- Create new policies with unique names
CREATE POLICY "Users can read work orders"
  ON work_orders
  FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'view'));

CREATE POLICY "Users can create work orders"
  ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(auth.uid(), company_id, 'work_orders', 'create'));

CREATE POLICY "Users can update work orders"
  ON work_orders
  FOR UPDATE
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'edit'))
  WITH CHECK (has_permission(auth.uid(), company_id, 'work_orders', 'edit'));

CREATE POLICY "Users can delete work orders"
  ON work_orders
  FOR DELETE
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'delete'));