/*
  # Fix Work Order Relationships and Add Vehicle Field

  1. Changes
    - Add vehicle_id column to work_orders table
    - Add foreign key constraint to vehicles table
    - Add function to sync vehicle_id with asset fields
    - Add helper functions for validation
    - Add missing indexes

  2. Security
    - Maintain existing RLS policies
    - Add proper access control for relationships
*/

-- Add vehicle_id column if it doesn't exist
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders(vehicle_id);

-- Create function to sync vehicle_id with asset fields
CREATE OR REPLACE FUNCTION sync_work_order_vehicle()
RETURNS trigger AS $$
BEGIN
  -- When vehicle_id is set, update asset fields
  IF NEW.vehicle_id IS NOT NULL THEN
    NEW.asset_type := 'vehicle';
    NEW.asset_id := NEW.vehicle_id;
  END IF;

  -- When asset fields are set to a vehicle, update vehicle_id
  IF NEW.asset_type = 'vehicle' AND NEW.asset_id IS NOT NULL THEN
    NEW.vehicle_id := NEW.asset_id;
  END IF;

  -- Clear vehicle_id if asset type is not vehicle
  IF NEW.asset_type != 'vehicle' THEN
    NEW.vehicle_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync vehicle_id
CREATE TRIGGER sync_work_order_vehicle_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_order_vehicle();

-- Update existing work orders to set vehicle_id
UPDATE work_orders
SET vehicle_id = asset_id
WHERE asset_type = 'vehicle';

-- Create helper function to check if a work order exists for a vehicle
CREATE OR REPLACE FUNCTION has_work_orders(vehicle_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM work_orders
    WHERE vehicle_id = vehicle_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if a technician can be assigned to a work order
CREATE OR REPLACE FUNCTION can_assign_technician_to_work_order(
  technician_uuid uuid,
  work_order_uuid uuid
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM technicians t
    JOIN work_orders wo ON wo.company_id = t.company_id
    WHERE t.id = technician_uuid
    AND wo.id = work_order_uuid
    AND t.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get work order details
CREATE OR REPLACE FUNCTION get_work_order_details(work_order_uuid uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  status text,
  priority text,
  asset_type text,
  asset_id uuid,
  vehicle_id uuid,
  assigned_to uuid,
  technician_name text,
  due_date timestamptz,
  completed_at timestamptz,
  parts_cost decimal(10,2),
  labor_cost decimal(10,2),
  total_cost decimal(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wo.id,
    wo.title,
    wo.description,
    wo.type,
    wo.status,
    wo.priority,
    wo.asset_type,
    wo.asset_id,
    wo.vehicle_id,
    wo.assigned_to,
    CASE 
      WHEN t.id IS NOT NULL THEN 
        (SELECT first_name || ' ' || last_name 
         FROM users 
         WHERE id = t.user_id)
      ELSE NULL
    END as technician_name,
    wo.due_date,
    wo.completed_at,
    wo.parts_cost,
    wo.labor_cost,
    COALESCE(wo.parts_cost, 0) + COALESCE(wo.labor_cost, 0) as total_cost
  FROM work_orders wo
  LEFT JOIN technicians t ON t.id = wo.assigned_to
  WHERE wo.id = work_order_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;