-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read technical metrics" ON technical_metrics;
DROP POLICY IF EXISTS "Users can insert technical metrics" ON technical_metrics;

-- Create new policies for technical_metrics table
CREATE POLICY "Users can read technical metrics"
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

CREATE POLICY "Users can insert technical metrics"
  ON technical_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
    )
  );

-- Create policy for updates
CREATE POLICY "Users can update technical metrics"
  ON technical_metrics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
    )
  );

-- Create policy for deletes
CREATE POLICY "Users can delete technical metrics"
  ON technical_metrics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
    )
  );

-- Helper function to check if user can manage metrics
CREATE OR REPLACE FUNCTION can_manage_metrics(user_uuid uuid, company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = user_uuid
    AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to safely record technical metrics
CREATE OR REPLACE FUNCTION record_technical_metric(
  p_company_id uuid,
  p_metric_type text,
  p_metric_name text,
  p_metric_value numeric,
  p_unit text,
  p_component text DEFAULT 'system'
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  -- Verify user has permission
  IF NOT can_manage_metrics(auth.uid(), p_company_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Insert metric
  INSERT INTO technical_metrics (
    company_id,
    metric_type,
    metric_name,
    metric_value,
    unit,
    component,
    timestamp
  ) VALUES (
    p_company_id,
    p_metric_type,
    p_metric_name,
    p_metric_value,
    p_unit,
    p_component,
    now()
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error recording technical metric: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;