-- Create locations table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL DEFAULT 'USA',
  postal_code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  
  -- Ensure location names are unique within a company
  CONSTRAINT locations_company_id_name_key UNIQUE (company_id, name),
  
  -- Validate status values
  CONSTRAINT valid_location_status CHECK (status IN ('active', 'inactive'))
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_locations_company_id ON locations(company_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_state ON locations(state);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Global admins can access all locations" ON locations;
DROP POLICY IF EXISTS "Users can view company locations" ON locations;
DROP POLICY IF EXISTS "Company admins can manage locations" ON locations;

-- Create policies
-- Global admins can do anything
CREATE POLICY "Global admins can access all locations" 
  ON locations
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- Users can view locations for their company
CREATE POLICY "Users can view company locations" 
  ON locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = locations.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Company admins can manage locations
CREATE POLICY "Company admins can manage locations" 
  ON locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = locations.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = locations.company_id
      AND user_companies.user_id = auth.uid()
      AND user_companies.role = 'admin'
    )
  );

-- Create or replace audit logging function for locations
CREATE OR REPLACE FUNCTION log_location_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action text;
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields jsonb;
  v_user_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Determine the action
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE_LOCATION';
    v_old_data := null;
    v_new_data := to_jsonb(NEW);
    v_changed_fields := v_new_data;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE_LOCATION';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT jsonb_object_agg(key, v_new_data->key)
    INTO v_changed_fields
    FROM jsonb_each(v_new_data)
    WHERE v_new_data->key IS DISTINCT FROM v_old_data->key;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE_LOCATION';
    v_old_data := to_jsonb(OLD);
    v_new_data := null;
    v_changed_fields := v_old_data;
  END IF;

  -- Insert audit log
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_user_id,
    v_action,
    jsonb_build_object(
      'location_id', COALESCE(NEW.id, OLD.id),
      'company_id', COALESCE(NEW.company_id, OLD.company_id),
      'old_data', v_old_data,
      'new_data', v_new_data,
      'changed_fields', v_changed_fields
    ),
    v_user_id
  );
  
  RETURN NULL;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS location_audit_insert ON locations;
DROP TRIGGER IF EXISTS location_audit_update ON locations;
DROP TRIGGER IF EXISTS location_audit_delete ON locations;

-- Create triggers for audit logging
CREATE TRIGGER location_audit_insert
AFTER INSERT ON locations
FOR EACH ROW
EXECUTE FUNCTION log_location_changes();

CREATE TRIGGER location_audit_update
AFTER UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION log_location_changes();

CREATE TRIGGER location_audit_delete
AFTER DELETE ON locations
FOR EACH ROW
EXECUTE FUNCTION log_location_changes();