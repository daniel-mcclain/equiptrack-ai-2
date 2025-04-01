-- Drop all existing policies first
DO $$ 
BEGIN
  -- Drop maintenance_templates policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global admins can access all maintenance templates' AND tablename = 'maintenance_templates') THEN
    DROP POLICY "Global admins can access all maintenance templates" ON maintenance_templates;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read company maintenance templates' AND tablename = 'maintenance_templates') THEN
    DROP POLICY "Users can read company maintenance templates" ON maintenance_templates;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert company maintenance templates' AND tablename = 'maintenance_templates') THEN
    DROP POLICY "Users can insert company maintenance templates" ON maintenance_templates;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update company maintenance templates' AND tablename = 'maintenance_templates') THEN
    DROP POLICY "Users can update company maintenance templates" ON maintenance_templates;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete company maintenance templates' AND tablename = 'maintenance_templates') THEN
    DROP POLICY "Users can delete company maintenance templates" ON maintenance_templates;
  END IF;

  -- Drop vehicle_maintenance_schedules policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global admins can access all maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
    DROP POLICY "Global admins can access all maintenance schedules" ON vehicle_maintenance_schedules;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
    DROP POLICY "Users can read vehicle maintenance schedules" ON vehicle_maintenance_schedules;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
    DROP POLICY "Users can insert vehicle maintenance schedules" ON vehicle_maintenance_schedules;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
    DROP POLICY "Users can update vehicle maintenance schedules" ON vehicle_maintenance_schedules;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
    DROP POLICY "Users can delete vehicle maintenance schedules" ON vehicle_maintenance_schedules;
  END IF;
END $$;

-- Create new policies for maintenance_templates
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global admins can access all maintenance templates' AND tablename = 'maintenance_templates') THEN
    CREATE POLICY "Global admins can access all maintenance templates"
      ON maintenance_templates
      FOR ALL
      TO authenticated
      USING (is_global_admin(auth.uid()))
      WITH CHECK (is_global_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read company maintenance templates' AND tablename = 'maintenance_templates') THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert company maintenance templates' AND tablename = 'maintenance_templates') THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update company maintenance templates' AND tablename = 'maintenance_templates') THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete company maintenance templates' AND tablename = 'maintenance_templates') THEN
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

-- Create new policies for vehicle_maintenance_schedules
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global admins can access all maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
    CREATE POLICY "Global admins can access all maintenance schedules"
      ON vehicle_maintenance_schedules
      FOR ALL
      TO authenticated
      USING (is_global_admin(auth.uid()))
      WITH CHECK (is_global_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete vehicle maintenance schedules' AND tablename = 'vehicle_maintenance_schedules') THEN
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

-- Update or create helper function to check maintenance permissions
CREATE OR REPLACE FUNCTION has_maintenance_permission(user_uuid uuid, company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Global admins can access all maintenance data
  IF is_global_admin(user_uuid) THEN
    RETURN true;
  END IF;

  -- Company owners can access their company's maintenance data
  RETURN EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;