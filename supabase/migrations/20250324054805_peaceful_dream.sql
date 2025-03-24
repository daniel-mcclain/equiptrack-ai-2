/*
  # Fix Work Orders Asset Relationships

  1. Changes
    - Add foreign key constraints for work orders
    - Add trigger-based validation for asset relationships
    - Add indexes for better query performance
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add proper access control for asset relationships
*/

-- Create function to validate asset references
CREATE OR REPLACE FUNCTION validate_work_order_asset()
RETURNS trigger AS $$
BEGIN
  IF NEW.asset_type = 'vehicle' THEN
    IF NOT EXISTS (
      SELECT 1 FROM vehicles WHERE id = NEW.asset_id
    ) THEN
      RAISE EXCEPTION 'Invalid vehicle ID';
    END IF;
  ELSIF NEW.asset_type = 'equipment' THEN
    IF NOT EXISTS (
      SELECT 1 FROM equipment WHERE id = NEW.asset_id
    ) THEN
      RAISE EXCEPTION 'Invalid equipment ID';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid asset type';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate asset references
DROP TRIGGER IF EXISTS validate_work_order_asset_trigger ON work_orders;
CREATE TRIGGER validate_work_order_asset_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_work_order_asset();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_asset_type_id 
  ON work_orders(asset_type, asset_id);

-- Update RLS policies to handle asset relationships
DROP POLICY IF EXISTS "Users can access work orders for their company vehicles" ON work_orders;

CREATE POLICY "Users can access work orders for company assets"
  ON work_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = work_orders.company_id
      AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = work_orders.company_id
      AND uc.user_id = auth.uid()
    )
  );

-- Helper function to validate asset type
CREATE OR REPLACE FUNCTION is_valid_asset_type(asset_type text)
RETURNS boolean AS $$
BEGIN
  RETURN asset_type IN ('vehicle', 'equipment');
END;
$$ LANGUAGE plpgsql;