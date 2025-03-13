/*
  # Add vehicle tags support

  1. Changes
    - Add tags array column to vehicles table
    - Add index for better performance when querying by tags

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add tags column to vehicles table
ALTER TABLE vehicles
  ADD COLUMN tags text[] DEFAULT '{}';

-- Create GIN index for faster array operations
CREATE INDEX idx_vehicles_tags ON vehicles USING GIN (tags);

-- Helper function to check if a vehicle has a specific tag
CREATE OR REPLACE FUNCTION public.vehicle_has_tag(vehicle_uuid uuid, tag_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vehicles
    WHERE id = vehicle_uuid
    AND tag_name = ANY(tags)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;