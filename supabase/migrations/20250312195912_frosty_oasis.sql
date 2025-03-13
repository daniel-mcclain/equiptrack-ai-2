/*
  # Fix Maintenance Templates Migration

  1. Changes
    - Add existence checks for policies before creating them
    - Keep all table creation and index creation
    - Ensure idempotent policy creation
*/

-- Create maintenance templates table
CREATE TABLE IF NOT EXISTS maintenance_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  schedule_type text NOT NULL,
  description text NOT NULL,
  interval_type text NOT NULL,
  interval_value integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle maintenance schedules table
CREATE TABLE IF NOT EXISTS vehicle_maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES maintenance_templates(id) ON DELETE CASCADE,
  last_completed timestamptz,
  next_due timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, template_id)
);

-- Drop old table if exists
DROP TABLE IF EXISTS maintenance_schedules;

-- Enable RLS
ALTER TABLE maintenance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_templates' 
    AND policyname = 'Users can read company maintenance templates'
  ) THEN
    CREATE POLICY "Users can read company maintenance templates"
      ON maintenance_templates
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM companies
          WHERE companies.id = maintenance_templates.company_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_templates' 
    AND policyname = 'Users can insert company maintenance templates'
  ) THEN
    CREATE POLICY "Users can insert company maintenance templates"
      ON maintenance_templates
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM companies
          WHERE companies.id = maintenance_templates.company_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_templates' 
    AND policyname = 'Users can update company maintenance templates'
  ) THEN
    CREATE POLICY "Users can update company maintenance templates"
      ON maintenance_templates
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM companies
          WHERE companies.id = maintenance_templates.company_id
          AND companies.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM companies
          WHERE companies.id = maintenance_templates.company_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_templates' 
    AND policyname = 'Users can delete company maintenance templates'
  ) THEN
    CREATE POLICY "Users can delete company maintenance templates"
      ON maintenance_templates
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM companies
          WHERE companies.id = maintenance_templates.company_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policies for vehicle_maintenance_schedules
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_schedules' 
    AND policyname = 'Users can read vehicle maintenance schedules'
  ) THEN
    CREATE POLICY "Users can read vehicle maintenance schedules"
      ON vehicle_maintenance_schedules
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM vehicles
          JOIN companies ON companies.id = vehicles.company_id
          WHERE vehicles.id = vehicle_maintenance_schedules.vehicle_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_schedules' 
    AND policyname = 'Users can insert vehicle maintenance schedules'
  ) THEN
    CREATE POLICY "Users can insert vehicle maintenance schedules"
      ON vehicle_maintenance_schedules
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM vehicles
          JOIN companies ON companies.id = vehicles.company_id
          WHERE vehicles.id = vehicle_maintenance_schedules.vehicle_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_schedules' 
    AND policyname = 'Users can update vehicle maintenance schedules'
  ) THEN
    CREATE POLICY "Users can update vehicle maintenance schedules"
      ON vehicle_maintenance_schedules
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM vehicles
          JOIN companies ON companies.id = vehicles.company_id
          WHERE vehicles.id = vehicle_maintenance_schedules.vehicle_id
          AND companies.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM vehicles
          JOIN companies ON companies.id = vehicles.company_id
          WHERE vehicles.id = vehicle_maintenance_schedules.vehicle_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_schedules' 
    AND policyname = 'Users can delete vehicle maintenance schedules'
  ) THEN
    CREATE POLICY "Users can delete vehicle maintenance schedules"
      ON vehicle_maintenance_schedules
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM vehicles
          JOIN companies ON companies.id = vehicles.company_id
          WHERE vehicles.id = vehicle_maintenance_schedules.vehicle_id
          AND companies.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_templates_company_id ON maintenance_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_schedules_vehicle_id ON vehicle_maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_schedules_template_id ON vehicle_maintenance_schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_schedules_next_due ON vehicle_maintenance_schedules(next_due);