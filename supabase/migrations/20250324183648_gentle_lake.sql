/*
  # Update Database Security Policies

  1. Changes
    - Drop existing policies before creating new ones
    - Add role-based permission system
    - Update RLS policies to use permissions
    - Make migration idempotent

  2. Security
    - Maintain secure access control
    - Implement role-based security model
*/

-- Helper function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(
  user_uuid uuid,
  company_uuid uuid,
  resource text,
  action text
) RETURNS boolean AS $$
BEGIN
  -- Company owners always have all permissions
  IF EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND owner_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check role-based permissions
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.company_id = rp.company_id AND ur.role = rp.role
    WHERE ur.user_id = user_uuid
    AND ur.company_id = company_uuid
    AND rp.resource = resource
    AND rp.action = action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing policies
DO $$ 
BEGIN
  -- Work Orders
  DROP POLICY IF EXISTS "Users can access work orders for company assets" ON work_orders;
  DROP POLICY IF EXISTS "Users can read work orders" ON work_orders;
  DROP POLICY IF EXISTS "Users can create work orders" ON work_orders;
  DROP POLICY IF EXISTS "Users can update work orders" ON work_orders;
  DROP POLICY IF EXISTS "Users can delete work orders" ON work_orders;

  -- Work Order Parts
  DROP POLICY IF EXISTS "Users can read work order parts" ON work_order_parts;
  DROP POLICY IF EXISTS "Users can manage work order parts" ON work_order_parts;
  DROP POLICY IF EXISTS "Technicians can manage work order parts" ON work_order_parts;

  -- Work Order Labor
  DROP POLICY IF EXISTS "Users can read work order labor" ON work_order_labor;
  DROP POLICY IF EXISTS "Users can manage work order labor" ON work_order_labor;
  DROP POLICY IF EXISTS "Technicians can manage work order labor" ON work_order_labor;

  -- Work Order Notes
  DROP POLICY IF EXISTS "Users can read work order notes" ON work_order_notes;
  DROP POLICY IF EXISTS "Users can manage work order notes" ON work_order_notes;
  DROP POLICY IF EXISTS "Technicians can manage their notes" ON work_order_notes;

  -- Parts Inventory
  DROP POLICY IF EXISTS "Users can read company parts inventory" ON parts_inventory;
  DROP POLICY IF EXISTS "Users can manage company parts inventory" ON parts_inventory;
  DROP POLICY IF EXISTS "Users can read parts inventory" ON parts_inventory;
  DROP POLICY IF EXISTS "Users can manage parts inventory" ON parts_inventory;
END $$;

-- Create new policies for work orders
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

-- Create new policies for work order parts
CREATE POLICY "work_order_parts_read_policy"
  ON work_order_parts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'view')
    )
  );

CREATE POLICY "work_order_parts_write_policy"
  ON work_order_parts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
    )
  );

-- Create new policies for work order labor
CREATE POLICY "work_order_labor_read_policy"
  ON work_order_labor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_labor.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'view')
    )
  );

CREATE POLICY "work_order_labor_write_policy"
  ON work_order_labor
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_labor.work_order_id
      AND (
        -- Allow technicians to manage their own labor entries
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_labor.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        -- Allow users with work order edit permission
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_labor.work_order_id
      AND (
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_labor.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  );

-- Create new policies for work order notes
CREATE POLICY "work_order_notes_read_policy"
  ON work_order_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'view')
    )
  );

CREATE POLICY "work_order_notes_write_policy"
  ON work_order_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id
      AND (
        -- Allow technicians to manage their own notes
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_notes.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        -- Allow users with work order edit permission
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id
      AND (
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_notes.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  );

-- Create new policies for parts inventory
CREATE POLICY "parts_inventory_read_policy"
  ON parts_inventory
  FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'parts_inventory', 'view'));

CREATE POLICY "parts_inventory_write_policy"
  ON parts_inventory
  FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'parts_inventory', 'edit'))
  WITH CHECK (has_permission(auth.uid(), company_id, 'parts_inventory', 'edit'));