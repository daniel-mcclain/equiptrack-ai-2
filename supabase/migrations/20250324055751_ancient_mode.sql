/*
  # Fix work orders constraints and add missing relationships

  1. Changes
    - Add function to check constraint existence
    - Add function to check index existence
    - Add constraints and indexes if they don't exist
    - Add helper functions for validation

  2. Security
    - Maintain existing RLS policies
*/

-- Function to check if a constraint exists
CREATE OR REPLACE FUNCTION constraint_exists(p_table_name text, p_constraint_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = p_table_name
    AND tc.constraint_name = p_constraint_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if an index exists
CREATE OR REPLACE FUNCTION index_exists(p_index_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = p_index_name
  );
END;
$$ LANGUAGE plpgsql;

-- Add constraints if they don't exist
DO $$ 
BEGIN
  -- Add status constraint
  IF NOT constraint_exists('work_orders', 'valid_work_order_status') THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT valid_work_order_status
      CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));
  END IF;

  -- Add priority constraint
  IF NOT constraint_exists('work_orders', 'valid_work_order_priority') THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT valid_work_order_priority
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;

  -- Add type constraint
  IF NOT constraint_exists('work_orders', 'valid_work_order_type') THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT valid_work_order_type
      CHECK (type IN ('repair', 'maintenance', 'inspection', 'other'));
  END IF;

  -- Add asset type constraint
  IF NOT constraint_exists('work_orders', 'valid_asset_type') THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT valid_asset_type
      CHECK (asset_type IN ('vehicle', 'equipment'));
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT index_exists('idx_work_orders_company_id') THEN
    CREATE INDEX idx_work_orders_company_id ON work_orders(company_id);
  END IF;

  IF NOT index_exists('idx_work_orders_asset_id') THEN
    CREATE INDEX idx_work_orders_asset_id ON work_orders(asset_id);
  END IF;

  IF NOT index_exists('idx_work_orders_asset_type_id') THEN
    CREATE INDEX idx_work_orders_asset_type_id ON work_orders(asset_type, asset_id);
  END IF;

  IF NOT index_exists('idx_work_orders_assigned_to') THEN
    CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
  END IF;

  IF NOT index_exists('idx_work_orders_status') THEN
    CREATE INDEX idx_work_orders_status ON work_orders(status);
  END IF;

  IF NOT index_exists('idx_work_orders_due_date') THEN
    CREATE INDEX idx_work_orders_due_date ON work_orders(due_date);
  END IF;

  IF NOT index_exists('idx_work_orders_created_at') THEN
    CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
  END IF;
END $$;

-- Create or replace the asset validation function
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

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS validate_work_order_asset_trigger ON work_orders;
CREATE TRIGGER validate_work_order_asset_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_work_order_asset();

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can access work orders for company assets" ON work_orders;

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