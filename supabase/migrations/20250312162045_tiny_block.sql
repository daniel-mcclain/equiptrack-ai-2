/*
  # Add group settings to company_settings

  1. Changes
    - Add default group settings for new companies
    - Update initialize_company_settings() function to include groups

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Update initialize_company_settings() function to include groups
CREATE OR REPLACE FUNCTION initialize_company_settings()
RETURNS trigger AS $$
BEGIN
  -- Vehicle Types
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'vehicle_type', 'Truck', 'truck', 'Heavy-duty trucks and semi-trucks', true, 1),
    (NEW.id, 'vehicle_type', 'Van', 'van', 'Delivery and cargo vans', true, 2),
    (NEW.id, 'vehicle_type', 'Car', 'car', 'Passenger vehicles', true, 3),
    (NEW.id, 'vehicle_type', 'SUV', 'suv', 'Sport utility vehicles', true, 4),
    (NEW.id, 'vehicle_type', 'Bus', 'bus', 'Passenger buses', true, 5),
    (NEW.id, 'vehicle_type', 'Trailer', 'trailer', 'Cargo trailers', true, 6),
    (NEW.id, 'vehicle_type', 'Heavy Equipment', 'heavy_equipment', 'Construction and industrial equipment', true, 7);

  -- Statuses
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'status', 'Active', 'active', 'Vehicle is operational and in service', true, 1),
    (NEW.id, 'status', 'Inactive', 'inactive', 'Vehicle is temporarily out of service', true, 2),
    (NEW.id, 'status', 'Maintenance', 'maintenance', 'Vehicle is undergoing maintenance', true, 3),
    (NEW.id, 'status', 'Out of Service', 'out_of_service', 'Vehicle is permanently out of service', true, 4);

  -- Ownership Types
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'ownership_type', 'Owned', 'owned', 'Company-owned vehicle', true, 1),
    (NEW.id, 'ownership_type', 'Leased', 'leased', 'Leased vehicle', true, 2),
    (NEW.id, 'ownership_type', 'Rented', 'rented', 'Short-term rental', true, 3);

  -- Groups
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'group', 'Main Fleet', 'main_fleet', 'Primary vehicle fleet', true, 1),
    (NEW.id, 'group', 'Local Delivery', 'local_delivery', 'Local delivery vehicles', true, 2),
    (NEW.id, 'group', 'Long Haul', 'long_haul', 'Long-distance transportation fleet', true, 3),
    (NEW.id, 'group', 'Special Operations', 'special_ops', 'Specialized vehicle fleet', true, 4),
    (NEW.id, 'group', 'Training', 'training', 'Training vehicles', true, 5);

  -- Common Tags
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'tag', 'Long Haul', 'long_haul', 'Long-distance transportation', true, 1),
    (NEW.id, 'tag', 'Local Delivery', 'local_delivery', 'Local delivery routes', true, 2),
    (NEW.id, 'tag', 'Refrigerated', 'refrigerated', 'Temperature-controlled cargo', true, 3),
    (NEW.id, 'tag', 'Hazmat', 'hazmat', 'Hazardous materials transport', true, 4),
    (NEW.id, 'tag', 'Express', 'express', 'Priority/express delivery', true, 5),
    (NEW.id, 'tag', 'Heavy Load', 'heavy_load', 'Heavy cargo transport', true, 6),
    (NEW.id, 'tag', 'Special Equipment', 'special_equipment', 'Specialized equipment', true, 7),
    (NEW.id, 'tag', 'Training', 'training', 'Used for training purposes', true, 8),
    (NEW.id, 'tag', 'Backup', 'backup', 'Backup/reserve vehicle', true, 9),
    (NEW.id, 'tag', 'VIP', 'vip', 'VIP/executive transport', true, 10);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;