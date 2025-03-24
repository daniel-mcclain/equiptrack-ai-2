/*
  # Add Vehicle Field to Work Orders

  1. Changes
    - Add vehicle_id column to work orders table
    - Add foreign key constraint to vehicles table
    - Add index for better query performance
    - Add trigger to sync vehicle_id with asset fields

  2. Security
    - Maintain existing RLS policies
*/

-- Add vehicle_id column
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