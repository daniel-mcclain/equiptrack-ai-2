/*
  # Add vehicle groups support

  1. Changes
    - Add groups array column to vehicles table
    - Add index for better performance when querying by group

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add groups column to vehicles table
ALTER TABLE vehicles
  ADD COLUMN groups text[] DEFAULT '{}';

-- Create GIN index for faster array operations
CREATE INDEX idx_vehicles_groups ON vehicles USING GIN (groups);

-- Helper function to check if a vehicle belongs to a specific group
CREATE OR REPLACE FUNCTION public.vehicle_in_group(vehicle_uuid uuid, group_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vehicles
    WHERE id = vehicle_uuid
    AND group_name = ANY(groups)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;