/*
  # Create maintenance schedules table

  1. New Tables
    - `maintenance_schedules`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `vehicle_id` (uuid, foreign key to vehicles)
      - `schedule_type` (text)
      - `description` (text)
      - `interval_type` (text)
      - `interval_value` (integer)
      - `last_completed` (timestamptz)
      - `next_due` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `maintenance_schedules` table
    - Add policies for authenticated users to manage their company's schedules
*/

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  schedule_type text NOT NULL,
  description text NOT NULL,
  interval_type text NOT NULL,
  interval_value integer NOT NULL,
  last_completed timestamptz,
  next_due timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Allow users to read maintenance schedules for their company
CREATE POLICY "Users can read company maintenance schedules"
  ON maintenance_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = maintenance_schedules.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Allow users to insert maintenance schedules for their company
CREATE POLICY "Users can insert company maintenance schedules"
  ON maintenance_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = maintenance_schedules.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Allow users to update maintenance schedules for their company
CREATE POLICY "Users can update company maintenance schedules"
  ON maintenance_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = maintenance_schedules.company_id
      AND companies.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = maintenance_schedules.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Allow users to delete maintenance schedules for their company
CREATE POLICY "Users can delete company maintenance schedules"
  ON maintenance_schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = maintenance_schedules.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_maintenance_schedules_company_id ON maintenance_schedules(company_id);
CREATE INDEX idx_maintenance_schedules_vehicle_id ON maintenance_schedules(vehicle_id);
CREATE INDEX idx_maintenance_schedules_next_due ON maintenance_schedules(next_due);