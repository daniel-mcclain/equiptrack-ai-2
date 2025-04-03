/*
  # Add Reporting System Tables and Functions

  1. New Tables
    - `user_activity_logs`: Track detailed user activity
    - `system_metrics`: Store performance metrics
    - `business_metrics`: Track business KPIs
    - `technical_metrics`: Store technical performance data
    - `report_schedules`: Configure report generation schedules
    - `report_access_controls`: Manage report access permissions

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
*/

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
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

-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  unit text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Create business metrics table
CREATE TABLE IF NOT EXISTS business_metrics (
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

-- Create technical metrics table
CREATE TABLE IF NOT EXISTS technical_metrics (
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

-- Create report schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
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

-- Create report access controls table
CREATE TABLE IF NOT EXISTS report_access_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  role text NOT NULL,
  access_level text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, report_type, role)
);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_controls ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_user_activity_logs_company ON user_activity_logs(company_id);
CREATE INDEX idx_user_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_session ON user_activity_logs(session_id);
CREATE INDEX idx_user_activity_logs_type ON user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_logs_feature ON user_activity_logs(feature_accessed);
CREATE INDEX idx_user_activity_logs_time ON user_activity_logs(start_time, end_time);

CREATE INDEX idx_system_metrics_company ON system_metrics(company_id);
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_time ON system_metrics(timestamp);

CREATE INDEX idx_business_metrics_company ON business_metrics(company_id);
CREATE INDEX idx_business_metrics_type ON business_metrics(metric_type);
CREATE INDEX idx_business_metrics_name ON business_metrics(metric_name);
CREATE INDEX idx_business_metrics_period ON business_metrics(period_start, period_end);

CREATE INDEX idx_technical_metrics_company ON technical_metrics(company_id);
CREATE INDEX idx_technical_metrics_type ON technical_metrics(metric_type);
CREATE INDEX idx_technical_metrics_name ON technical_metrics(metric_name);
CREATE INDEX idx_technical_metrics_component ON technical_metrics(component);
CREATE INDEX idx_technical_metrics_time ON technical_metrics(timestamp);

CREATE INDEX idx_report_schedules_company ON report_schedules(company_id);
CREATE INDEX idx_report_schedules_type ON report_schedules(report_type);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run);

CREATE INDEX idx_report_access_controls_company ON report_access_controls(company_id);
CREATE INDEX idx_report_access_controls_type ON report_access_controls(report_type);
CREATE INDEX idx_report_access_controls_role ON report_access_controls(role);

-- Create policies
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