-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read technical metrics' AND tablename = 'technical_metrics') THEN
    DROP POLICY "Users can read technical metrics" ON technical_metrics;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert technical metrics' AND tablename = 'technical_metrics') THEN
    DROP POLICY "Users can insert technical metrics" ON technical_metrics;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update technical metrics' AND tablename = 'technical_metrics') THEN
    DROP POLICY "Users can update technical metrics" ON technical_metrics;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete technical metrics' AND tablename = 'technical_metrics') THEN
    DROP POLICY "Users can delete technical metrics" ON technical_metrics;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global admins can access all technical metrics' AND tablename = 'technical_metrics') THEN
    DROP POLICY "Global admins can access all technical metrics" ON technical_metrics;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read company technical metrics' AND tablename = 'technical_metrics') THEN
    DROP POLICY "Users can read company technical metrics" ON technical_metrics;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage company technical metrics' AND tablename = 'technical_metrics') THEN
    DROP POLICY "Users can manage company technical metrics" ON technical_metrics;
  END IF;
END $$;

-- Create new policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global admins can access all technical metrics' AND tablename = 'technical_metrics') THEN
    CREATE POLICY "Global admins can access all technical metrics"
      ON technical_metrics
      FOR ALL
      TO authenticated
      USING (is_global_admin(auth.uid()))
      WITH CHECK (is_global_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read company technical metrics' AND tablename = 'technical_metrics') THEN
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage company technical metrics' AND tablename = 'technical_metrics') THEN
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
  END IF;
END $$;

-- Create or replace helper functions
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