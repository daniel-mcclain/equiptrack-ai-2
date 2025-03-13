/*
  # Add company settings table

  1. New Tables
    - `company_settings`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `setting_type` (text) - type of setting (vehicle_type, status, tag, ownership_type)
      - `name` (text) - display name of the setting
      - `value` (text) - actual value used in the system
      - `description` (text) - optional description
      - `is_default` (boolean) - whether this is a default setting
      - `is_active` (boolean) - whether this setting is currently active
      - `sort_order` (integer) - for controlling display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on company_settings table
    - Add policies for company members to read settings
    - Add policies for company owners to manage settings
*/

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_type text NOT NULL,
  name text NOT NULL,
  value text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, setting_type, value)
);

-- Create indexes
CREATE INDEX idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX idx_company_settings_type ON company_settings(setting_type);
CREATE INDEX idx_company_settings_active ON company_settings(is_active);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = company_settings.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can manage settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Function to initialize default settings for a new company
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

-- Create trigger to initialize settings for new companies
CREATE TRIGGER on_company_created_init_settings
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION initialize_company_settings();