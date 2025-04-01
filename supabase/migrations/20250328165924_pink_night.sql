/*
  # Add Company ID to Maintenance Schedules

  1. New Columns
    - Add company_id to vehicle_maintenance_schedules
    - Add foreign key constraint to companies table
    - Add indexes for better query performance

  2. Changes
    - Update existing records with company_id from vehicles table
    - Add NOT NULL constraint after data migration
    - Add validation trigger for company consistency

  3. Security
    - Update RLS policies to use company_id
    - Add helper functions for permission checks
*/

-- Add company_id column
ALTER TABLE vehicle_maintenance_schedules
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_schedules_company 
  ON vehicle_maintenance_schedules(company_id);

-- Update existing records with company_id from vehicles
UPDATE vehicle_maintenance_schedules vms
SET company_id = v.company_id
FROM vehicles v
WHERE v.id = vms.vehicle_id;

-- Add foreign key constraint and NOT NULL constraint
ALTER TABLE vehicle_maintenance_schedules
  ALTER COLUMN company_id SET NOT NULL,
  ADD CONSTRAINT vehicle_maintenance_schedules_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;

-- Create function to validate company consistency
CREATE OR REPLACE FUNCTION validate_maintenance_schedule_company()
RETURNS trigger AS $$
BEGIN
  -- Ensure vehicle belongs to the same company
  IF NEW.company_id != (
    SELECT company_id FROM vehicles WHERE id = NEW.vehicle_id
  ) THEN
    RAISE EXCEPTION 'Vehicle must belong to the same company as the maintenance schedule';
  END IF;

  -- Ensure template belongs to the same company
  IF NEW.company_id != (
    SELECT company_id FROM maintenance_templates WHERE id = NEW.template_id
  ) THEN
    RAISE EXCEPTION 'Template must belong to the same company as the maintenance schedule';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for company validation
CREATE TRIGGER validate_maintenance_schedule_company_trigger
  BEFORE INSERT OR UPDATE ON vehicle_maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION validate_maintenance_schedule_company();

-- Drop existing policies
DO $$ 
BEGIN
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

-- Create new policies using company_id
CREATE POLICY "Global admins can access all maintenance schedules"
  ON vehicle_maintenance_schedules
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Users can read company maintenance schedules"
  ON vehicle_maintenance_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = vehicle_maintenance_schedules.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company maintenance schedules"
  ON vehicle_maintenance_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = vehicle_maintenance_schedules.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company maintenance schedules"
  ON vehicle_maintenance_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = vehicle_maintenance_schedules.company_id
      AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = vehicle_maintenance_schedules.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company maintenance schedules"
  ON vehicle_maintenance_schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = vehicle_maintenance_schedules.company_id
      AND uc.user_id = auth.uid()
    )
  );

-- Create helper function to check maintenance schedule permissions
CREATE OR REPLACE FUNCTION has_maintenance_schedule_permission(
  user_uuid uuid,
  company_uuid uuid,
  action text
)
RETURNS boolean AS $$
BEGIN
  -- Global admins can do everything
  IF is_global_admin(user_uuid) THEN
    RETURN true;
  END IF;

  -- Check user's company association and role
  RETURN EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = user_uuid
    AND uc.company_id = company_uuid
    AND (
      -- Admins and managers can do everything
      uc.role IN ('admin', 'manager')
      OR
      -- Others can only view
      (uc.role IN ('user', 'viewer') AND action = 'view')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get company ID for maintenance schedule
CREATE OR REPLACE FUNCTION get_maintenance_schedule_company(schedule_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT company_id
    FROM vehicle_maintenance_schedules
    WHERE id = schedule_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;