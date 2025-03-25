/*
  # Add Reporting System Tables and Functions

  1. Changes
    - Add reporting system tables with proper constraints
    - Add RLS policies for security
    - Add helper functions for metrics calculation
    - Add indexes with existence checks

  2. Security
    - Enable RLS on all tables
    - Add proper access control policies
*/

-- Create tables if they don't exist
DO $$ 
BEGIN
  -- Create user activity logs table
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_activity_logs') THEN
    CREATE TABLE user_activity_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id),
      session_id uuid NOT NULL,
      activity_type text NOT NULL,
      feature_accessed text NOT NULL,
      start_time timestamptz NOT NULL,
      end_time timestamptz,
      metadata jsonb,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create system metrics table
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_metrics') THEN
    CREATE TABLE system_metrics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      metric_type text NOT NULL,
      metric_name text NOT NULL,
      metric_value numeric NOT NULL,
      unit text NOT NULL,
      timestamp timestamptz NOT NULL DEFAULT now(),
      metadata jsonb
    );
  END IF;

  -- Create business metrics table
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'business_metrics') THEN
    CREATE TABLE business_metrics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      metric_type text NOT NULL,
      metric_name text NOT NULL,
      metric_value numeric NOT NULL,
      currency text,
      period_start timestamptz NOT NULL,
      period_end timestamptz NOT NULL,
      metadata jsonb,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create technical metrics table
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'technical_metrics') THEN
    CREATE TABLE technical_metrics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      metric_type text NOT NULL,
      metric_name text NOT NULL,
      metric_value numeric NOT NULL,
      unit text NOT NULL,
      component text NOT NULL,
      timestamp timestamptz NOT NULL DEFAULT now(),
      metadata jsonb
    );
  END IF;

  -- Create report schedules table
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'report_schedules') THEN
    CREATE TABLE report_schedules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      report_type text NOT NULL,
      frequency text NOT NULL,
      next_run timestamptz NOT NULL,
      last_run timestamptz,
      recipients jsonb,
      format text[] NOT NULL,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create report access controls table
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'report_access_controls') THEN
    CREATE TABLE report_access_controls (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      report_type text NOT NULL,
      role text NOT NULL,
      access_level text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(company_id, report_type, role)
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_controls ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  -- User Activity Logs indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_activity_logs_company') THEN
    CREATE INDEX idx_user_activity_logs_company ON user_activity_logs(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_activity_logs_user') THEN
    CREATE INDEX idx_user_activity_logs_user ON user_activity_logs(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_activity_logs_session') THEN
    CREATE INDEX idx_user_activity_logs_session ON user_activity_logs(session_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_activity_logs_type') THEN
    CREATE INDEX idx_user_activity_logs_type ON user_activity_logs(activity_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_activity_logs_feature') THEN
    CREATE INDEX idx_user_activity_logs_feature ON user_activity_logs(feature_accessed);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_activity_logs_time') THEN
    CREATE INDEX idx_user_activity_logs_time ON user_activity_logs(start_time, end_time);
  END IF;

  -- System Metrics indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_metrics_company') THEN
    CREATE INDEX idx_system_metrics_company ON system_metrics(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_metrics_type') THEN
    CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_metrics_name') THEN
    CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_metrics_time') THEN
    CREATE INDEX idx_system_metrics_time ON system_metrics(timestamp);
  END IF;

  -- Business Metrics indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_metrics_company') THEN
    CREATE INDEX idx_business_metrics_company ON business_metrics(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_metrics_type') THEN
    CREATE INDEX idx_business_metrics_type ON business_metrics(metric_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_metrics_name') THEN
    CREATE INDEX idx_business_metrics_name ON business_metrics(metric_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_metrics_period') THEN
    CREATE INDEX idx_business_metrics_period ON business_metrics(period_start, period_end);
  END IF;

  -- Technical Metrics indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_technical_metrics_company') THEN
    CREATE INDEX idx_technical_metrics_company ON technical_metrics(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_technical_metrics_type') THEN
    CREATE INDEX idx_technical_metrics_type ON technical_metrics(metric_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_technical_metrics_name') THEN
    CREATE INDEX idx_technical_metrics_name ON technical_metrics(metric_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_technical_metrics_component') THEN
    CREATE INDEX idx_technical_metrics_component ON technical_metrics(component);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_technical_metrics_time') THEN
    CREATE INDEX idx_technical_metrics_time ON technical_metrics(timestamp);
  END IF;

  -- Report Schedules indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_schedules_company') THEN
    CREATE INDEX idx_report_schedules_company ON report_schedules(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_schedules_type') THEN
    CREATE INDEX idx_report_schedules_type ON report_schedules(report_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_schedules_next_run') THEN
    CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run);
  END IF;

  -- Report Access Controls indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_access_controls_company') THEN
    CREATE INDEX idx_report_access_controls_company ON report_access_controls(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_access_controls_type') THEN
    CREATE INDEX idx_report_access_controls_type ON report_access_controls(report_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_access_controls_role') THEN
    CREATE INDEX idx_report_access_controls_role ON report_access_controls(role);
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- User Activity Logs policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read company metrics') THEN
    DROP POLICY "Users can read company metrics" ON user_activity_logs;
  END IF;

  -- System Metrics policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read system metrics') THEN
    DROP POLICY "Users can read system metrics" ON system_metrics;
  END IF;

  -- Business Metrics policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read business metrics') THEN
    DROP POLICY "Users can read business metrics" ON business_metrics;
  END IF;

  -- Technical Metrics policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read technical metrics') THEN
    DROP POLICY "Users can read technical metrics" ON technical_metrics;
  END IF;

  -- Report Schedules policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage report schedules') THEN
    DROP POLICY "Users can manage report schedules" ON report_schedules;
  END IF;

  -- Report Access Controls policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage report access') THEN
    DROP POLICY "Users can manage report access" ON report_access_controls;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Users can read company metrics"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = user_activity_logs.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can read system metrics"
  ON system_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = system_metrics.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can read business metrics"
  ON business_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = business_metrics.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can read technical metrics"
  ON technical_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = technical_metrics.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can manage report schedules"
  ON report_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = report_schedules.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = report_schedules.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can manage report access"
  ON report_access_controls
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = report_access_controls.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = report_access_controls.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  );

-- Helper functions

-- Calculate user activity metrics
CREATE OR REPLACE FUNCTION get_user_activity_metrics(
  company_uuid uuid,
  start_date timestamptz,
  end_date timestamptz
) RETURNS TABLE (
  total_users bigint,
  active_users bigint,
  new_users bigint,
  avg_session_duration interval,
  retention_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      COUNT(DISTINCT user_id) as total_users,
      COUNT(DISTINCT CASE 
        WHEN start_time >= start_date AND start_time <= end_date 
        THEN user_id 
      END) as active_users,
      COUNT(DISTINCT CASE 
        WHEN created_at >= start_date AND created_at <= end_date 
        THEN user_id 
      END) as new_users,
      AVG(end_time - start_time) as avg_session_duration,
      ROUND(
        COUNT(DISTINCT CASE 
          WHEN start_time >= start_date AND start_time <= end_date 
          THEN user_id 
        END)::numeric / 
        NULLIF(COUNT(DISTINCT user_id), 0)::numeric * 100,
        2
      ) as retention_rate
    FROM user_activity_logs
    WHERE company_id = company_uuid
  )
  SELECT * FROM user_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate system performance metrics
CREATE OR REPLACE FUNCTION get_system_performance_metrics(
  company_uuid uuid,
  start_date timestamptz,
  end_date timestamptz
) RETURNS TABLE (
  avg_response_time numeric,
  error_rate numeric,
  uptime_percentage numeric,
  peak_resource_usage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(CASE WHEN metric_name = 'response_time' THEN metric_value END) as avg_response_time,
    ROUND(
      COUNT(CASE WHEN metric_name = 'error_count' THEN 1 END)::numeric /
      NULLIF(COUNT(*), 0)::numeric * 100,
      2
    ) as error_rate,
    ROUND(
      AVG(CASE WHEN metric_name = 'uptime' THEN metric_value END),
      2
    ) as uptime_percentage,
    MAX(CASE WHEN metric_name = 'resource_usage' THEN metric_value END) as peak_resource_usage
  FROM system_metrics
  WHERE 
    company_id = company_uuid
    AND timestamp >= start_date 
    AND timestamp <= end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate business metrics
CREATE OR REPLACE FUNCTION get_business_metrics(
  company_uuid uuid,
  start_date timestamptz,
  end_date timestamptz
) RETURNS TABLE (
  total_revenue numeric,
  conversion_rate numeric,
  customer_acquisition_cost numeric,
  average_order_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(CASE WHEN metric_name = 'revenue' THEN metric_value END) as total_revenue,
    ROUND(
      AVG(CASE WHEN metric_name = 'conversion_rate' THEN metric_value END),
      2
    ) as conversion_rate,
    ROUND(
      AVG(CASE WHEN metric_name = 'customer_acquisition_cost' THEN metric_value END),
      2
    ) as customer_acquisition_cost,
    ROUND(
      AVG(CASE WHEN metric_name = 'average_order_value' THEN metric_value END),
      2
    ) as average_order_value
  FROM business_metrics
  WHERE 
    company_id = company_uuid
    AND period_start >= start_date 
    AND period_end <= end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate technical metrics
CREATE OR REPLACE FUNCTION get_technical_metrics(
  company_uuid uuid,
  start_date timestamptz,
  end_date timestamptz
) RETURNS TABLE (
  deployment_frequency numeric,
  bug_resolution_time interval,
  api_success_rate numeric,
  database_performance_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN metric_name = 'deployment' THEN 1 END)::numeric as deployment_frequency,
    AVG(
      CASE WHEN metric_name = 'bug_resolution_time' 
      THEN make_interval(secs => metric_value) 
      END
    ) as bug_resolution_time,
    ROUND(
      AVG(CASE WHEN metric_name = 'api_success_rate' THEN metric_value END),
      2
    ) as api_success_rate,
    ROUND(
      AVG(CASE WHEN metric_name = 'database_performance' THEN metric_value END),
      2
    ) as database_performance_score
  FROM technical_metrics
  WHERE 
    company_id = company_uuid
    AND timestamp >= start_date 
    AND timestamp <= end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has report access
CREATE OR REPLACE FUNCTION has_report_access(
  user_uuid uuid,
  company_uuid uuid,
  report_type text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM report_access_controls rac
    JOIN user_companies uc ON uc.company_id = rac.company_id AND uc.role = rac.role
    WHERE rac.company_id = company_uuid
    AND uc.user_id = user_uuid
    AND rac.report_type = report_type
    AND rac.access_level IN ('view', 'edit')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;