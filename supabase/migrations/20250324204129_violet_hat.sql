/*
  # Add Inventory Update Trigger for Work Order Parts

  1. Changes
    - Add trigger function to update parts inventory when work order parts are added/removed
    - Add trigger to work_order_parts table
    - Add constraint to prevent adding more parts than available in inventory

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with proper error handling
*/

-- Create function to update inventory quantities
CREATE OR REPLACE FUNCTION update_parts_inventory()
RETURNS trigger AS $$
BEGIN
  -- For INSERT operations
  IF (TG_OP = 'INSERT') THEN
    -- Check if there's enough inventory
    IF NOT EXISTS (
      SELECT 1 FROM parts_inventory
      WHERE id = NEW.part_id
      AND quantity_in_stock >= NEW.quantity
    ) THEN
      RAISE EXCEPTION 'Insufficient inventory for part %', NEW.part_id;
    END IF;

    -- Update inventory quantity
    UPDATE parts_inventory
    SET 
      quantity_in_stock = quantity_in_stock - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.part_id;

    RETURN NEW;
  
  -- For DELETE operations
  ELSIF (TG_OP = 'DELETE') THEN
    -- Return parts to inventory
    UPDATE parts_inventory
    SET 
      quantity_in_stock = quantity_in_stock + OLD.quantity,
      updated_at = now()
    WHERE id = OLD.part_id;

    RETURN OLD;
  
  -- For UPDATE operations
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If part_id changed, return old parts and check new parts
    IF (OLD.part_id != NEW.part_id) THEN
      -- Check if there's enough of the new part
      IF NOT EXISTS (
        SELECT 1 FROM parts_inventory
        WHERE id = NEW.part_id
        AND quantity_in_stock >= NEW.quantity
      ) THEN
        RAISE EXCEPTION 'Insufficient inventory for new part %', NEW.part_id;
      END IF;

      -- Return old parts to inventory
      UPDATE parts_inventory
      SET 
        quantity_in_stock = quantity_in_stock + OLD.quantity,
        updated_at = now()
      WHERE id = OLD.part_id;

      -- Remove new parts from inventory
      UPDATE parts_inventory
      SET 
        quantity_in_stock = quantity_in_stock - NEW.quantity,
        updated_at = now()
      WHERE id = NEW.part_id;
    
    -- If only quantity changed
    ELSE
      -- Calculate the difference
      DECLARE
        quantity_diff integer;
      BEGIN
        quantity_diff := NEW.quantity - OLD.quantity;
        
        -- Check if there's enough inventory for an increase
        IF quantity_diff > 0 AND NOT EXISTS (
          SELECT 1 FROM parts_inventory
          WHERE id = NEW.part_id
          AND quantity_in_stock >= quantity_diff
        ) THEN
          RAISE EXCEPTION 'Insufficient inventory for part %', NEW.part_id;
        END IF;

        -- Update inventory
        UPDATE parts_inventory
        SET 
          quantity_in_stock = quantity_in_stock - quantity_diff,
          updated_at = now()
        WHERE id = NEW.part_id;
      END;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on work_order_parts table
DROP TRIGGER IF EXISTS update_parts_inventory_trigger ON work_order_parts;
CREATE TRIGGER update_parts_inventory_trigger
  AFTER INSERT OR UPDATE OR DELETE ON work_order_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_parts_inventory();

-- Add helper function to check if part has sufficient inventory
CREATE OR REPLACE FUNCTION has_sufficient_inventory(part_uuid uuid, required_quantity integer)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parts_inventory
    WHERE id = part_uuid
    AND quantity_in_stock >= required_quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;