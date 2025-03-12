/*
  # Initial Schema Setup for Fleet Management System

  1. New Tables
    - vehicles
      - Basic vehicle information and status
    - equipment
      - Equipment tracking and details
    - maintenance_records
      - Maintenance history and scheduling
    - operators
      - Equipment operator information
    - assignments
      - Equipment-operator assignments

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  license_plate text,
  vin text,
  mileage integer DEFAULT 0,
  fuel_type text,
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  location text,
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  asset_type text NOT NULL,
  maintenance_type text NOT NULL,
  description text,
  cost decimal(10,2),
  performed_by text,
  performed_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Operators table
CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  license_number text,
  license_expiry date,
  certification text[],
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES operators(id),
  asset_id uuid NOT NULL,
  asset_type text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read maintenance records"
  ON maintenance_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read operators"
  ON operators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (true);

-- Insert demo data
INSERT INTO vehicles (name, type, status, manufacturer, model, year, license_plate)
VALUES
  ('Truck 101', 'Heavy Duty', 'Active', 'Volvo', 'VNL 860', 2023, 'ABC123'),
  ('Van 201', 'Delivery', 'Active', 'Mercedes', 'Sprinter', 2022, 'XYZ789'),
  ('Truck 102', 'Medium Duty', 'Maintenance', 'Ford', 'F-650', 2021, 'DEF456');

INSERT INTO equipment (name, type, status, manufacturer, model, serial_number)
VALUES
  ('Forklift 001', 'Material Handling', 'Active', 'Toyota', '8FBN', 'TY123456'),
  ('Generator 001', 'Power Equipment', 'Active', 'Caterpillar', 'D3516', 'CAT789012'),
  ('Crane 001', 'Heavy Equipment', 'Maintenance', 'Liebherr', 'LTM 1100', 'LH456789');

INSERT INTO operators (first_name, last_name, email, phone, status)
VALUES
  ('John', 'Doe', 'john.doe@example.com', '555-0101', 'Active'),
  ('Jane', 'Smith', 'jane.smith@example.com', '555-0102', 'Active'),
  ('Bob', 'Johnson', 'bob.johnson@example.com', '555-0103', 'On Leave');