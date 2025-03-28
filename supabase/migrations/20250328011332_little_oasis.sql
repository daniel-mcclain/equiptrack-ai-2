-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read technical metrics" ON technical_metrics;
DROP POLICY IF EXISTS "Users can insert technical metrics" ON technical_metrics;
DROP POLICY IF EXISTS "Users can update technical metrics" ON technical_metrics;
DROP POLICY IF EXISTS "Users can delete technical metrics" ON technical_metrics;
DROP POLICY IF EXISTS "Global admins can access all technical metrics" ON technical_metrics;

-- Create new policies for technical_metrics table
CREATE POLICY "Global admins can access all technical metrics"
  ON technical_metrics
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Users can read company technical metrics"
  ON technical_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company technical metrics"
  ON technical_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

-- Create helper function to check if user can manage technical metrics
CREATE OR REPLACE FUNCTION can_manage_technical_metrics(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Global admins can always manage metrics
  IF is_global_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  -- Company admins and managers can manage metrics
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid()
    AND company_id = company_uuid
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user can read technical metrics
CREATE OR REPLACE FUNCTION can_read_technical_metrics(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Global admins can always read metrics
  IF is_global_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  -- Users can read metrics for their company
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid()
    AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;