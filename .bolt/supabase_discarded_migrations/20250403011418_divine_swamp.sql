/*
  # Initial Schema Setup for Fleet Management System

  This migration creates the entire database schema for the fleet management system.
  It includes all tables, constraints, indexes, functions, and policies needed for the application.
*/

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== TABLES ====================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text NOT NULL,
  fleet_size integer NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  street_address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  subscription_tier text NOT NULL DEFAULT 'test_drive',
  subscription_start_date timestamptz DEFAULT now(),
  subscription_end_date timestamptz,
  max_vehicles integer NOT NULL DEFAULT 3,
  is_trial boolean NOT NULL DEFAULT true,
  trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('test_drive', 'starter', 'standard', 'professional'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'active',
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  email text,
  city text,
  date_of_birth date,
  language text DEFAULT 'en',
  theme text DEFAULT 'system',
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  profile_visibility text DEFAULT 'private',
  two_factor_enabled boolean DEFAULT false,
  state text,
  department text,
  title text,
  location text,
  manager text,
  notes text,
  start_date date,
  is_global_admin boolean DEFAULT false,
  selected_company_id uuid REFERENCES companies(id),
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_theme CHECK (theme IN ('light', 'dark', 'system')),
  CONSTRAINT valid_profile_visibility CHECK (profile_visibility IN ('public', 'private', 'contacts'))
);

-- User companies junction table
CREATE TABLE IF NOT EXISTS user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, role, resource, action)
);

-- User audit logs table
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  action text NOT NULL,
  details jsonb,
  performed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  created_at timestamptz DEFAULT now()
);

-- Admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb NOT NULL,
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  license_plate text,
  vin text,
  mileage integer DEFAULT 0,
  fuel_type text,
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  groups text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  location text,
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  technical_specs jsonb,
  operating_requirements text[],
  safety_guidelines text[],
  required_certifications text[],
  notes text,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  is_demo boolean DEFAULT false
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  asset_type text NOT NULL,
  maintenance_type text NOT NULL,
  description text,
  cost decimal(10,2),
  performed_by text,
  performed_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Maintenance templates table
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

-- Vehicle maintenance schedules table
CREATE TABLE IF NOT EXISTS vehicle_maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES maintenance_templates(id) ON DELETE CASCADE,
  last_completed timestamptz,
  next_due timestamptz NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, template_id)
);

-- Company settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_type text NOT NULL,
  name text NOT NULL,
  value text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, setting_type, value)
);

-- Work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  asset_type text NOT NULL,
  asset_id uuid NOT NULL,
  due_date timestamptz,
  completed_at timestamptz,
  estimated_hours decimal(10,2),
  actual_hours decimal(10,2),
  parts_cost decimal(10,2),
  labor_cost decimal(10,2),
  notes text,
  attachments text[],
  created_by uuid NOT NULL REFERENCES users(id),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_work_order_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  CONSTRAINT valid_work_order_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_work_order_type CHECK (type IN ('repair', 'maintenance', 'inspection', 'other')),
  CONSTRAINT valid_asset_type CHECK (asset_type IN ('vehicle', 'equipment'))
);

-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  job_title text,
  hire_date date,
  certifications text[],
  skills text[],
  hourly_rate decimal(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id),
  CONSTRAINT valid_technician_status CHECK (status IN ('active', 'inactive', 'on_leave'))
);

-- Work order notes table
CREATE TABLE IF NOT EXISTS work_order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES technicians(id),
  category text NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_note_category CHECK (category IN ('diagnostic', 'repair', 'customer_communication', 'internal', 'quality_check'))
);

-- Parts inventory table
CREATE TABLE IF NOT EXISTS parts_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  description text NOT NULL,
  unit_cost decimal(10,2) NOT NULL,
  quantity_in_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 0,
  category text,
  manufacturer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, part_number)
);

-- Work order parts table
CREATE TABLE IF NOT EXISTS work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts_inventory(id),
  quantity integer NOT NULL,
  unit_cost decimal(10,2) NOT NULL,
  total_cost decimal(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Work order labor table
CREATE TABLE IF NOT EXISTS work_order_labor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES technicians(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  break_minutes integer DEFAULT 0,
  hourly_rate decimal(10,2) NOT NULL,
  is_overtime boolean DEFAULT false,
  total_hours decimal(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN ROUND(CAST(
        EXTRACT(EPOCH FROM (end_time - start_time))/3600 - (break_minutes/60.0)
      AS numeric), 2)
      ELSE 0
    END
  ) STORED,
  total_cost decimal(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN ROUND(
        (EXTRACT(EPOCH FROM (end_time - start_time))/3600 - (break_minutes/60.0)) * 
        CASE WHEN is_overtime THEN hourly_rate * 1.5 ELSE hourly_rate END
      , 2)
      ELSE 0
    END
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Part purchases table
CREATE TABLE IF NOT EXISTS part_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts_inventory(id),
  supplier text NOT NULL,
  purchase_date date NOT NULL,
  purchase_price decimal(10,2) NOT NULL,
  quantity integer NOT NULL,
  unit_of_measurement text NOT NULL,
  order_number text NOT NULL,
  delivery_status text NOT NULL,
  expected_delivery_date date,
  storage_location text NOT NULL,
  quality_notes text,
  warranty_info text,
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'delayed'))
);

-- User activity logs table
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

-- System metrics table
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

-- Business metrics table
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

-- Technical metrics table
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

-- Report schedules table
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

-- Report access controls table
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

-- Subscription events table
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- User verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  user_data jsonb NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Equipment usage table
CREATE TABLE IF NOT EXISTS equipment_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  department_id uuid,
  checkout_date timestamptz NOT NULL,
  return_date timestamptz,
  expected_return_date timestamptz,
  purpose text,
  notes text,
  condition_at_return text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==================== INDEXES ====================

-- Companies indexes
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_companies_stripe_customer ON companies(stripe_customer_id);
CREATE INDEX idx_companies_stripe_subscription ON companies(stripe_subscription_id);
CREATE INDEX idx_companies_stripe_customer_id ON companies(stripe_customer_id);

-- Users indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_company_lookup ON users(company_id, id);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_global_admin ON users(is_global_admin);
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_manager ON users(manager);
CREATE INDEX idx_users_notes ON users USING gin(to_tsvector('english', COALESCE(notes, '')));
CREATE INDEX idx_users_selected_company ON users(selected_company_id);
CREATE INDEX idx_users_start_date ON users(start_date);
CREATE INDEX idx_users_title ON users(title);
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_first_name_idx ON users(first_name);
CREATE INDEX users_last_name_idx ON users(last_name);
CREATE INDEX users_role_idx ON users(role);

-- User companies indexes
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX idx_user_companies_role ON user_companies(role);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_company_id ON user_roles(company_id);

-- Role permissions indexes
CREATE INDEX idx_role_permissions_company_id ON role_permissions(company_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_resource ON role_permissions(resource);
CREATE INDEX idx_role_permissions_action ON role_permissions(action);

-- User audit logs indexes
CREATE INDEX idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX idx_user_audit_logs_created_at ON user_audit_logs(created_at);
CREATE INDEX idx_user_audit_logs_performed_by ON user_audit_logs(performed_by);

-- Vehicles indexes
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_groups ON vehicles USING gin(groups);
CREATE INDEX idx_vehicles_tags ON vehicles USING gin(tags);

-- Equipment indexes
CREATE INDEX idx_equipment_company_id ON equipment(company_id);
CREATE INDEX idx_equipment_is_demo ON equipment(is_demo);

-- Maintenance records indexes
CREATE INDEX idx_maintenance_records_asset ON maintenance_records(asset_id, asset_type);
CREATE INDEX idx_maintenance_records_date ON maintenance_records(performed_at);

-- Maintenance templates indexes
CREATE INDEX idx_maintenance_templates_company_id ON maintenance_templates(company_id);

-- Vehicle maintenance schedules indexes
CREATE INDEX idx_vehicle_maintenance_schedules_company ON vehicle_maintenance_schedules(company_id);
CREATE INDEX idx_vehicle_maintenance_schedules_next_due ON vehicle_maintenance_schedules(next_due);
CREATE INDEX idx_vehicle_maintenance_schedules_template_id ON vehicle_maintenance_schedules(template_id);
CREATE INDEX idx_vehicle_maintenance_schedules_vehicle_id ON vehicle_maintenance_schedules(vehicle_id);

-- Company settings indexes
CREATE INDEX idx_company_settings_active ON company_settings(is_active);
CREATE INDEX idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX idx_company_settings_type ON company_settings(setting_type);

-- Work orders indexes
CREATE INDEX idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX idx_work_orders_asset_type_id ON work_orders(asset_type, asset_id);
CREATE INDEX idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_vehicle_id ON work_orders(vehicle_id);

-- Technicians indexes
CREATE INDEX idx_technicians_company_id ON technicians(company_id);
CREATE INDEX idx_technicians_user_id ON technicians(user_id);
CREATE INDEX idx_technicians_status ON technicians(status);
CREATE INDEX idx_technicians_skills ON technicians USING gin(skills);
CREATE INDEX idx_technicians_certifications ON technicians USING gin(certifications);

-- Work order notes indexes
CREATE INDEX idx_work_order_notes_category ON work_order_notes(category);
CREATE INDEX idx_work_order_notes_technician ON work_order_notes(technician_id);
CREATE INDEX idx_work_order_notes_work_order ON work_order_notes(work_order_id);

-- Parts inventory indexes
CREATE INDEX idx_parts_inventory_company ON parts_inventory(company_id);
CREATE INDEX idx_parts_inventory_part_number ON parts_inventory(part_number);

-- Work order parts indexes
CREATE INDEX idx_work_order_parts_part ON work_order_parts(part_id);
CREATE INDEX idx_work_order_parts_work_order ON work_order_parts(work_order_id);

-- Work order labor indexes
CREATE INDEX idx_work_order_labor_end_time ON work_order_labor(end_time);
CREATE INDEX idx_work_order_labor_start_time ON work_order_labor(start_time);
CREATE INDEX idx_work_order_labor_technician ON work_order_labor(technician_id);
CREATE INDEX idx_work_order_labor_work_order ON work_order_labor(work_order_id);

-- Part purchases indexes
CREATE INDEX idx_part_purchases_company_id ON part_purchases(company_id);
CREATE INDEX idx_part_purchases_delivery_status ON part_purchases(delivery_status);
CREATE INDEX idx_part_purchases_part_id ON part_purchases(part_id);
CREATE INDEX idx_part_purchases_purchase_date ON part_purchases(purchase_date);

-- User activity logs indexes
CREATE INDEX idx_user_activity_logs_company ON user_activity_logs(company_id);
CREATE INDEX idx_user_activity_logs_feature ON user_activity_logs(feature_accessed);
CREATE INDEX idx_user_activity_logs_session ON user_activity_logs(session_id);
CREATE INDEX idx_user_activity_logs_time ON user_activity_logs(start_time, end_time);
CREATE INDEX idx_user_activity_logs_type ON user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_logs_user ON user_activity_logs(user_id);

-- System metrics indexes
CREATE INDEX idx_system_metrics_company ON system_metrics(company_id);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_time ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);

-- Business metrics indexes
CREATE INDEX idx_business_metrics_company ON business_metrics(company_id);
CREATE INDEX idx_business_metrics_name ON business_metrics(metric_name);
CREATE INDEX idx_business_metrics_period ON business_metrics(period_start, period_end);
CREATE INDEX idx_business_metrics_type ON business_metrics(metric_type);

-- Technical metrics indexes
CREATE INDEX idx_technical_metrics_company ON technical_metrics(company_id);
CREATE INDEX idx_technical_metrics_component ON technical_metrics(component);
CREATE INDEX idx_technical_metrics_name ON technical_metrics(metric_name);
CREATE INDEX idx_technical_metrics_time ON technical_metrics(timestamp);
CREATE INDEX idx_technical_metrics_type ON technical_metrics(metric_type);

-- Report schedules indexes
CREATE INDEX idx_report_schedules_company ON report_schedules(company_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run);
CREATE INDEX idx_report_schedules_type ON report_schedules(report_type);

-- Report access controls indexes
CREATE INDEX idx_report_access_controls_company ON report_access_controls(company_id);
CREATE INDEX idx_report_access_controls_role ON report_access_controls(role);
CREATE INDEX idx_report_access_controls_type ON report_access_controls(report_type);

-- Subscription events indexes
CREATE INDEX idx_subscription_events_company ON subscription_events(company_id);
CREATE INDEX idx_subscription_events_created ON subscription_events(created_at);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);

-- User verifications indexes
CREATE INDEX idx_user_verifications_email ON user_verifications(email);
CREATE INDEX idx_user_verifications_expires_at ON user_verifications(expires_at);
CREATE INDEX idx_user_verifications_token ON user_verifications(token);

-- Equipment usage indexes
CREATE INDEX idx_equipment_usage_dates ON equipment_usage(checkout_date, return_date);
CREATE INDEX idx_equipment_usage_equipment ON equipment_usage(equipment_id);
CREATE INDEX idx_equipment_usage_user ON equipment_usage(user_id);

-- ==================== FUNCTIONS ====================

-- Function to validate max vehicles
CREATE OR REPLACE FUNCTION validate_max_vehicles()
RETURNS trigger AS $$
BEGIN
  NEW.max_vehicles := 
    CASE NEW.subscription_tier
      WHEN 'test_drive' THEN 3
      WHEN 'starter' THEN 10
      WHEN 'standard' THEN 50
      WHEN 'professional' THEN 250
      ELSE 3
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new company creation
CREATE OR REPLACE FUNCTION handle_new_company()
RETURNS trigger AS $$
BEGIN
  -- Ensure we wait for auth user record to be fully created
  PERFORM pg_sleep(0.1);

  -- Insert into user_companies
  INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.owner_id,
    NEW.id,
    'owner',
    now(),
    now()
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE LOG 'Error in handle_new_company: %', SQLERRM;
    -- Return NEW to allow company creation even if user_companies creation fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize company settings
CREATE OR REPLACE FUNCTION initialize_company_settings()
RETURNS trigger AS $$
BEGIN
  -- Vehicle Types
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'vehicle_type', 'Truck', 'truck', 'Heavy-duty trucks and semi-trucks', true, 1),
    (NEW.id, 'vehicle_type', 'Van', 'van', 'Delivery and cargo vans', true, 2),
    (NEW.id, 'vehicle_type', 'Car', 'car', 'Passenger vehicles', true, 3),
    (NEW.id, 'vehicle_type', 'SUV', 'suv', 'Sport utility vehicles', true, 4),
    (NEW.id, 'vehicle_type', 'Bus', 'bus', 'Passenger buses', true, 5),
    (NEW.id, 'vehicle_type', 'Trailer', 'trailer', 'Cargo trailers', true, 6),
    (NEW.id, 'vehicle_type', 'Heavy Equipment', 'heavy_equipment', 'Construction and industrial equipment', true, 7);

  -- Statuses
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'status', 'Active', 'active', 'Vehicle is operational and in service', true, 1),
    (NEW.id, 'status', 'Inactive', 'inactive', 'Vehicle is temporarily out of service', true, 2),
    (NEW.id, 'status', 'Maintenance', 'maintenance', 'Vehicle is undergoing maintenance', true, 3),
    (NEW.id, 'status', 'Out of Service', 'out_of_service', 'Vehicle is permanently out of service', true, 4);

  -- Ownership Types
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'ownership_type', 'Owned', 'owned', 'Company-owned vehicle', true, 1),
    (NEW.id, 'ownership_type', 'Leased', 'leased', 'Leased vehicle', true, 2),
    (NEW.id, 'ownership_type', 'Rented', 'rented', 'Short-term rental', true, 3);

  -- Groups
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'group', 'Main Fleet', 'main_fleet', 'Primary vehicle fleet', true, 1),
    (NEW.id, 'group', 'Local Delivery', 'local_delivery', 'Local delivery vehicles', true, 2),
    (NEW.id, 'group', 'Long Haul', 'long_haul', 'Long-distance transportation fleet', true, 3),
    (NEW.id, 'group', 'Special Operations', 'special_ops', 'Specialized vehicle fleet', true, 4),
    (NEW.id, 'group', 'Training', 'training', 'Training vehicles', true, 5);

  -- Common Tags
  INSERT INTO company_settings (company_id, setting_type, name, value, description, is_default, sort_order)
  VALUES
    (NEW.id, 'tag', 'Long Haul', 'long_haul', 'Long-distance transportation', true, 1),
    (NEW.id, 'tag', 'Local Delivery', 'local_delivery', 'Local delivery routes', true, 2),
    (NEW.id, 'tag', 'Refrigerated', 'refrigerated', 'Temperature-controlled cargo', true, 3),
    (NEW.id, 'tag', 'Hazmat', 'hazmat', 'Hazardous materials transport', true, 4),
    (NEW.id, 'tag', 'Express', 'express', 'Priority/express delivery', true, 5),
    (NEW.id, 'tag', 'Heavy Load', 'heavy_load', 'Heavy cargo transport', true, 6),
    (NEW.id, 'tag', 'Special Equipment', 'special_equipment', 'Specialized equipment', true, 7),
    (NEW.id, 'tag', 'Training', 'training', 'Used for training purposes', true, 8),
    (NEW.id, 'tag', 'Backup', 'backup', 'Backup/reserve vehicle', true, 9),
    (NEW.id, 'tag', 'VIP', 'vip', 'VIP/executive transport', true, 10);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_company_id uuid;
  v_role text;
  v_retry_count integer := 0;
  v_max_retries constant integer := 3;
  v_success boolean := false;
BEGIN
  -- Log function entry
  RAISE LOG 'handle_new_user started for user %', NEW.id;

  -- Extract first and last name from metadata with proper fallbacks
  v_first_name := COALESCE(
    (NEW.raw_user_meta_data->>'first_name'),
    split_part(NEW.email, '@', 1)
  );
  
  v_last_name := COALESCE(
    (NEW.raw_user_meta_data->>'last_name'),
    'User'
  );

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    RAISE LOG 'User % already exists in users table', NEW.id;
    RETURN NEW;
  END IF;

  -- Find matching company by email domain
  v_company_id := find_company_by_email_domain(NEW.email);
  
  -- Set default role
  v_role := CASE 
    WHEN v_company_id IS NOT NULL THEN 'member'
    ELSE 'user'
  END;

  -- Retry loop for user creation
  WHILE v_retry_count < v_max_retries AND NOT v_success LOOP
    BEGIN
      -- Insert into users table
      INSERT INTO public.users (
        id,
        first_name,
        last_name,
        email,
        role,
        status,
        language,
        theme,
        email_notifications,
        push_notifications,
        sms_notifications,
        profile_visibility,
        two_factor_enabled,
        department,
        title,
        location,
        manager,
        notes,
        start_date,
        company_id,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        v_first_name,
        v_last_name,
        NEW.email,
        v_role,
        'active',
        'en',
        'system',
        true,
        true,
        false,
        'private',
        false,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        CURRENT_DATE,
        v_company_id,
        now(),
        now()
      );

      -- If we get here, the insert was successful
      v_success := true;
      RAISE LOG 'Successfully created user record for %', NEW.id;

      -- If company match found, create user_companies entry
      IF v_company_id IS NOT NULL THEN
        INSERT INTO user_companies (
          user_id,
          company_id,
          role,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          v_company_id,
          v_role,
          now(),
          now()
        );

        RAISE LOG 'Successfully linked user % to company %', NEW.id, v_company_id;
      END IF;

    EXCEPTION
      WHEN unique_violation THEN
        -- Another process may have created the user, check if it exists
        IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
          RAISE LOG 'User % was created by another process', NEW.id;
          v_success := true;
        ELSE
          -- If user doesn't exist, retry
          v_retry_count := v_retry_count + 1;
          RAISE LOG 'Retry % for user %', v_retry_count, NEW.id;
          PERFORM pg_sleep(0.1 * v_retry_count); -- Exponential backoff
        END IF;
      WHEN OTHERS THEN
        -- Log other errors and retry
        RAISE LOG 'Error creating user %: %', NEW.id, SQLERRM;
        v_retry_count := v_retry_count + 1;
        PERFORM pg_sleep(0.1 * v_retry_count);
    END;
  END LOOP;

  -- Log final status
  IF NOT v_success THEN
    RAISE LOG 'Failed to create user % after % retries', NEW.id, v_max_retries;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract email domain
CREATE OR REPLACE FUNCTION extract_email_domain(email text)
RETURNS text AS $$
BEGIN
  RETURN lower(split_part(email, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find company by email domain
CREATE OR REPLACE FUNCTION find_company_by_email_domain(user_email text)
RETURNS uuid AS $$
DECLARE
  v_company_id uuid;
  v_user_domain text;
BEGIN
  -- Extract and clean the user's email domain
  v_user_domain := extract_email_domain(user_email);
  
  -- Find matching company based on contact email domain
  SELECT id INTO v_company_id
  FROM companies
  WHERE extract_email_domain(contact_email) = v_user_domain
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user management actions
CREATE OR REPLACE FUNCTION log_user_management_action()
RETURNS trigger AS $$
DECLARE
  v_performed_by uuid;
  v_user_id uuid;
  v_details jsonb;
BEGIN
  -- Skip audit logging for Supabase admin actions
  IF current_setting('role') = 'service_role' THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    RETURN NULL;
  END IF;

  -- Get the user who performed the action
  v_performed_by := COALESCE(auth.uid(), get_supabase_admin_user());
  
  -- Get the user ID based on operation type
  v_user_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.id
    ELSE COALESCE(NEW.id, OLD.id)
  END;

  -- Skip if user_id is null
  IF v_user_id IS NULL THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    RETURN NULL;
  END IF;

  -- Build details object based on operation
  v_details := CASE
    WHEN TG_OP = 'DELETE' THEN jsonb_build_object(
      'operation', 'DELETE',
      'old_data', row_to_json(OLD),
      'is_supabase_admin', auth.uid() IS NULL
    )
    ELSE jsonb_build_object(
      'operation', TG_OP,
      'new_data', row_to_json(NEW),
      'old_data', CASE 
        WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
        ELSE NULL
      END,
      'is_supabase_admin', auth.uid() IS NULL,
      'user_id', v_user_id
    )
  END;

  -- Insert audit log
  INSERT INTO user_audit_logs (
    user_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_user_id,
    TG_OP,
    v_details,
    v_performed_by
  );

  -- Return appropriate value based on operation
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block the operation
    RAISE WARNING 'Error in log_user_management_action: %', SQLERRM;
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user updates
CREATE OR REPLACE FUNCTION validate_user_update()
RETURNS trigger AS $$
BEGIN
  -- Skip validation for Supabase admin actions
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if is_global_admin is being changed
  IF OLD.is_global_admin IS DISTINCT FROM NEW.is_global_admin THEN
    -- Only allow Supabase admins to change is_global_admin
    IF NOT is_supabase_admin() THEN
      RAISE EXCEPTION 'Only Supabase administrators can modify the global admin status';
    END IF;
  END IF;

  -- Ensure ID is preserved and not null
  IF NEW.id IS NULL THEN
    NEW.id := OLD.id;
  END IF;
  
  -- Update timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in validate_user_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get Supabase admin user
CREATE OR REPLACE FUNCTION get_supabase_admin_user()
RETURNS uuid AS $$
DECLARE
  v_admin_user_id uuid;
BEGIN
  -- Look for existing admin user
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'global_supabase_admin'
  LIMIT 1;
  
  -- If no admin user exists, create one
  IF v_admin_user_id IS NULL THEN
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data
    ) VALUES (
      'global_supabase_admin',
      crypt('supabase-admin-password', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'first_name', 'Global',
        'last_name', 'Admin'
      )
    )
    RETURNING id INTO v_admin_user_id;

    -- Create corresponding users record
    INSERT INTO users (
      id,
      first_name,
      last_name,
      email,
      role,
      status,
      is_global_admin
    ) VALUES (
      v_admin_user_id,
      'Global',
      'Admin',
      'global_supabase_admin',
      'admin',
      'active',
      true
    );
  END IF;

  RETURN v_admin_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is Supabase admin
CREATE OR REPLACE FUNCTION is_supabase_admin()
RETURNS boolean AS $$
BEGIN
  -- Check if the request is coming from a service role or the dashboard
  RETURN (current_setting('request.jwt.claim.role', true) = 'service_role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is global admin
CREATE OR REPLACE FUNCTION is_global_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_uuid
    AND is_global_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate maintenance schedule company
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

-- Function to validate work order asset
CREATE OR REPLACE FUNCTION validate_work_order_asset()
RETURNS trigger AS $$
BEGIN
  IF NEW.asset_type = 'vehicle' THEN
    IF NOT EXISTS (
      SELECT 1 FROM vehicles WHERE id = NEW.asset_id
    ) THEN
      RAISE EXCEPTION 'Invalid vehicle ID';
    END IF;
  ELSIF NEW.asset_type = 'equipment' THEN
    IF NOT EXISTS (
      SELECT 1 FROM equipment WHERE id = NEW.asset_id
    ) THEN
      RAISE EXCEPTION 'Invalid equipment ID';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid asset type';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync work order vehicle
CREATE OR REPLACE FUNCTION sync_work_order_vehicle()
RETURNS trigger AS $$
BEGIN
  -- When vehicle_id is set, update asset fields
  IF NEW.vehicle_id IS NOT NULL THEN
    NEW.asset_type := 'vehicle';
    NEW.asset_id := NEW.vehicle_id;
  END IF;

  -- When asset fields are set to a vehicle, update vehicle_id
  IF NEW.asset_type = 'vehicle' AND NEW.asset_id IS NOT NULL THEN
    NEW.vehicle_id := NEW.asset_id;
  END IF;

  -- Clear vehicle_id if asset type is not vehicle
  IF NEW.asset_type != 'vehicle' THEN
    NEW.vehicle_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update parts inventory
CREATE OR REPLACE FUNCTION update_parts_inventory()
RETURNS trigger AS $$
BEGIN
  -- For INSERT operations
  IF (TG_OP = 'INSERT') THEN
    -- Check if there's enough inventory
    IF NOT EXISTS (
      SELECT 1 FROM parts_inventory
      WHERE id = NEW.part_id
      AND quantity_in_stock >= NEW.quantity
    ) THEN
      RAISE EXCEPTION 'Insufficient inventory for part %', NEW.part_id;
    END IF;

    -- Update inventory quantity
    UPDATE parts_inventory
    SET 
      quantity_in_stock = quantity_in_stock - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.part_id;

    RETURN NEW;
  
  -- For DELETE operations
  ELSIF (TG_OP = 'DELETE') THEN
    -- Return parts to inventory
    UPDATE parts_inventory
    SET 
      quantity_in_stock = quantity_in_stock + OLD.quantity,
      updated_at = now()
    WHERE id = OLD.part_id;

    RETURN OLD;
  
  -- For UPDATE operations
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If part_id changed, return old parts and check new parts
    IF (OLD.part_id != NEW.part_id) THEN
      -- Check if there's enough of the new part
      IF NOT EXISTS (
        SELECT 1 FROM parts_inventory
        WHERE id = NEW.part_id
        AND quantity_in_stock >= NEW.quantity
      ) THEN
        RAISE EXCEPTION 'Insufficient inventory for new part %', NEW.part_id;
      END IF;

      -- Return old parts to inventory
      UPDATE parts_inventory
      SET 
        quantity_in_stock = quantity_in_stock + OLD.quantity,
        updated_at = now()
      WHERE id = OLD.part_id;

      -- Remove new parts from inventory
      UPDATE parts_inventory
      SET 
        quantity_in_stock = quantity_in_stock - NEW.quantity,
        updated_at = now()
      WHERE id = NEW.part_id;
    
    -- If only quantity changed
    ELSE
      -- Calculate the difference
      DECLARE
        quantity_diff integer;
      BEGIN
        quantity_diff := NEW.quantity - OLD.quantity;
        
        -- Check if there's enough inventory for an increase
        IF quantity_diff > 0 AND NOT EXISTS (
          SELECT 1 FROM parts_inventory
          WHERE id = NEW.part_id
          AND quantity_in_stock >= quantity_diff
        ) THEN
          RAISE EXCEPTION 'Insufficient inventory for part %', NEW.part_id;
        END IF;

        -- Update inventory
        UPDATE parts_inventory
        SET 
          quantity_in_stock = quantity_in_stock - quantity_diff,
          updated_at = now()
        WHERE id = NEW.part_id;
      END;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update work order costs
CREATE OR REPLACE FUNCTION update_work_order_costs()
RETURNS trigger AS $$
BEGIN
  UPDATE work_orders
  SET
    parts_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM work_order_parts
      WHERE work_order_id = NEW.work_order_id
    ),
    labor_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM work_order_labor
      WHERE work_order_id = NEW.work_order_id
      AND end_time IS NOT NULL
    ),
    updated_at = now()
  WHERE id = NEW.work_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  user_uuid uuid,
  company_uuid uuid,
  resource text,
  action text
) RETURNS boolean AS $$
BEGIN
  -- Company owners always have all permissions
  IF EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND owner_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check role-based permissions
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.company_id = rp.company_id AND ur.role = rp.role
    WHERE ur.user_id = user_uuid
    AND ur.company_id = company_uuid
    AND rp.resource = resource
    AND rp.action = action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has inventory permission
CREATE OR REPLACE FUNCTION has_inventory_permission(
  user_uuid uuid,
  company_uuid uuid,
  action text
) RETURNS boolean AS $$
BEGIN
  -- Company owners always have all permissions
  IF EXISTS (
    SELECT 1 FROM companies
    WHERE id = company_uuid
    AND owner_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check role-based permissions
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.company_id = rp.company_id AND ur.role = rp.role
    WHERE ur.user_id = user_uuid
    AND ur.company_id = company_uuid
    AND rp.resource = 'parts_inventory'
    AND rp.action = action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update selected company
CREATE OR REPLACE FUNCTION update_selected_company(company_uuid uuid)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is global admin
  IF NOT is_global_admin(v_user_id) THEN
    RETURN false;
  END IF;
  
  -- Update selected company
  UPDATE users
  SET 
    selected_company_id = company_uuid,
    updated_at = now()
  WHERE id = v_user_id;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available companies
CREATE OR REPLACE FUNCTION get_available_companies()
RETURNS TABLE (
  id uuid,
  name text,
  industry text,
  fleet_size integer,
  contact_name text,
  contact_email text
) AS $$
BEGIN
  -- Check if user is global admin
  IF NOT is_global_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  -- Return all companies
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.industry,
    c.fleet_size,
    c.contact_name,
    c.contact_email
  FROM companies c
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user_rpc()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_result jsonb;
  v_error_message text;
  v_is_already_admin boolean;
  v_company_id uuid;
  v_company_has_admin boolean;
  v_user_email text;
BEGIN
  -- Record start time
  v_start_time := clock_timestamp();
  
  -- Get current user
  v_user_id := auth.uid();
  
  -- Log function start
  RAISE LOG 'create_admin_user_rpc started for user %', v_user_id;
  
  IF v_user_id IS NULL THEN
    v_error_message := 'No authenticated user found';
    RAISE LOG 'create_admin_user_rpc error: %', v_error_message;
    
    -- Log attempt in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp()
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Check if user is already an admin
  v_is_already_admin := is_user_admin(v_user_id);
  
  IF v_is_already_admin THEN
    v_error_message := 'User is already an admin';
    RAISE LOG 'create_admin_user_rpc: % for user %', v_error_message, v_user_id;
    
    -- Log attempt in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp(),
        'already_admin', true,
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'already_admin', true
    );
  END IF;

  -- Find company ID for this user
  SELECT id INTO v_company_id
  FROM companies
  WHERE contact_email = v_user_email;
  
  IF v_company_id IS NULL THEN
    v_error_message := 'No matching company found for user';
    RAISE LOG 'create_admin_user_rpc: % for user %', v_error_message, v_user_id;
    
    -- Log attempt in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp(),
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Check if company already has an admin
  v_company_has_admin := company_has_admin(v_company_id);
  
  IF v_company_has_admin THEN
    v_error_message := 'Company already has an admin user';
    RAISE LOG 'create_admin_user_rpc: % for company %', v_error_message, v_company_id;
    
    -- Log attempt in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp(),
        'company_has_admin', true,
        'company_id', v_company_id,
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'company_has_admin', true
    );
  END IF;

  -- Check if user can be admin
  IF NOT can_be_admin(v_user_id) THEN
    v_error_message := 'User cannot be made admin';
    RAISE LOG 'create_admin_user_rpc error: % for user %', v_error_message, v_user_id;
    
    -- Log attempt in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp(),
        'can_be_admin_check', false,
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Make user admin and get result
  v_result := make_admin(v_user_id);
  v_end_time := clock_timestamp();
  
  -- Log completion
  RAISE LOG 'create_admin_user_rpc completed for user % with result: %', 
    v_user_id, 
    v_result;

  -- Log attempt in admin audit
  INSERT INTO admin_audit_logs (
    user_id,
    action,
    details,
    success,
    error_message
  ) VALUES (
    v_user_id,
    'CREATE_ADMIN_RPC',
    jsonb_build_object(
      'start_time', v_start_time,
      'end_time', v_end_time,
      'duration_ms', extract(milliseconds from v_end_time - v_start_time),
      'result', v_result,
      'email', v_user_email,
      'company_id', v_company_id
    ),
    (v_result->>'success')::boolean,
    v_result->>'error'
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    v_error_message := SQLERRM;
    RAISE LOG 'create_admin_user_rpc unexpected error for user %: %', v_user_id, v_error_message;
    
    -- Log error in admin audit
    INSERT INTO admin_audit_logs (
      user_id,
      action,
      details,
      success,
      error_message
    ) VALUES (
      v_user_id,
      'CREATE_ADMIN_RPC',
      jsonb_build_object(
        'start_time', v_start_time,
        'end_time', clock_timestamp(),
        'error_detail', SQLSTATE,
        'email', v_user_email
      ),
      false,
      v_error_message
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can be admin
CREATE OR REPLACE FUNCTION can_be_admin(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = user_uuid;

  -- Check if email matches any company's contact email
  RETURN EXISTS (
    SELECT 1 FROM companies
    WHERE contact_email = v_user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN user_companies uc ON u.id = uc.user_id
    WHERE u.id = user_uuid
    AND uc.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if company has admin
CREATE OR REPLACE FUNCTION company_has_admin(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN user_companies uc ON u.id = uc.user_id
    WHERE uc.company_id = company_uuid
    AND uc.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to setup admin permissions
CREATE OR REPLACE FUNCTION setup_admin_permissions(
  admin_id uuid,
  company_uuid uuid
) RETURNS void AS $$
BEGIN
  -- Insert admin permissions
  INSERT INTO role_permissions (
    company_id,
    role,
    resource,
    action,
    created_at,
    updated_at
  )
  SELECT 
    company_uuid,
    'admin',
    r.resource,
    a.action,
    now(),
    now()
  FROM 
    (VALUES 
      ('users'),
      ('vehicles'),
      ('equipment'),
      ('maintenance'),
      ('work_orders'),
      ('parts_inventory'),
      ('reports'),
      ('settings')
    ) as r(resource)
    CROSS JOIN
    (VALUES 
      ('view'),
      ('create'),
      ('edit'),
      ('delete')
    ) as a(action)
  ON CONFLICT (company_id, role, resource, action) 
    DO UPDATE SET 
      updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make user admin
CREATE OR REPLACE FUNCTION make_admin(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_email text;
  v_company_record companies%ROWTYPE;
  v_start_time timestamptz;
  v_error_message text;
  v_is_already_admin boolean;
  v_company_has_admin boolean;
  v_user_is_global_admin boolean;
BEGIN
  -- Record start time
  v_start_time := clock_timestamp();
  
  -- Log function start
  RAISE LOG 'make_admin started for user %', user_uuid;

  -- Check if user is already an admin
  v_is_already_admin := is_user_admin(user_uuid);
  
  IF v_is_already_admin THEN
    v_error_message := 'User is already an admin';
    RAISE LOG 'make_admin error: % for user %', v_error_message, user_uuid;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'already_admin', true
    );
  END IF;

  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = user_uuid;

  IF v_user_email IS NULL THEN
    v_error_message := 'User not found';
    RAISE LOG 'make_admin error: % for user %', v_error_message, user_uuid;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Find matching company
  SELECT * INTO v_company_record
  FROM companies
  WHERE contact_email = v_user_email;

  IF v_company_record IS NULL THEN
    v_error_message := 'No matching company found';
    RAISE LOG 'make_admin error: % for user % with email %', 
      v_error_message, 
      user_uuid, 
      v_user_email;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
  END IF;

  -- Check if company already has an admin
  v_company_has_admin := company_has_admin(v_company_record.id);
  
  IF v_company_has_admin THEN
    v_error_message := 'Company already has an admin user';
    RAISE LOG 'make_admin error: % for company %', v_error_message, v_company_record.id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'company_has_admin', true
    );
  END IF;

  -- Preserve global admin status
  SELECT is_global_admin INTO v_user_is_global_admin
  FROM users
  WHERE id = user_uuid;

  -- Log company match
  RAISE LOG 'make_admin found matching company % for user %', 
    v_company_record.id, 
    user_uuid;

  -- Create or update user record, preserving global admin status
  INSERT INTO users (
    id,
    first_name,
    last_name,
    email,
    role,
    status,
    company_id,
    language,
    theme,
    email_notifications,
    push_notifications,
    sms_notifications,
    profile_visibility,
    is_global_admin,
    created_at,
    updated_at
  ) 
  SELECT
    user_uuid,
    COALESCE(u.first_name, split_part(v_user_email, '@', 1)),
    COALESCE(u.last_name, 'Admin'),
    v_user_email,
    'admin',
    'active',
    v_company_record.id,
    COALESCE(u.language, 'en'),
    COALESCE(u.theme, 'system'),
    COALESCE(u.email_notifications, true),
    COALESCE(u.push_notifications, true),
    COALESCE(u.sms_notifications, false),
    COALESCE(u.profile_visibility, 'private'),
    COALESCE(v_user_is_global_admin, false), -- Preserve global admin status
    now(),
    now()
  FROM (SELECT * FROM users WHERE id = user_uuid) u
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    company_id = v_company_record.id,
    updated_at = now(),
    -- Explicitly preserve global admin status
    is_global_admin = COALESCE(v_user_is_global_admin, users.is_global_admin, false);

  RAISE LOG 'make_admin created/updated user record for user %', user_uuid;

  -- Ensure user_companies record exists
  INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    v_company_record.id,
    'admin',
    now(),
    now()
  )
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    role = 'admin',
    updated_at = now();

  RAISE LOG 'make_admin updated user_companies for user %', user_uuid;

  -- Setup admin permissions
  PERFORM setup_admin_permissions(user_uuid, v_company_record.id);

  RAISE LOG 'make_admin setup permissions completed for user %', user_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', user_uuid,
    'company_id', v_company_record.id,
    'company_name', v_company_record.name,
    'role', 'admin',
    'preserved_global_admin', v_user_is_global_admin
  );
EXCEPTION
  WHEN others THEN
    v_error_message := SQLERRM;
    RAISE LOG 'make_admin unexpected error for user %: %', user_uuid, v_error_message;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== TRIGGERS ====================

-- Trigger to enforce max vehicles
CREATE TRIGGER enforce_max_vehicles
  BEFORE INSERT OR UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION validate_max_vehicles();

-- Trigger for company creation
CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_company();

-- Trigger to initialize company settings
CREATE TRIGGER on_company_created_init_settings
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION initialize_company_settings();

-- Trigger for user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Triggers for user audit logging
CREATE TRIGGER user_audit_insert
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.id IS NOT NULL)
  EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_update
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.id IS NOT NULL)
  EXECUTE FUNCTION log_user_management_action();

CREATE TRIGGER user_audit_delete
  AFTER DELETE ON users
  FOR EACH ROW
  WHEN (OLD.id IS NOT NULL)
  EXECUTE FUNCTION log_user_management_action();

-- Trigger to validate user updates
CREATE TRIGGER validate_user_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_update();

-- Trigger to validate maintenance schedule company
CREATE TRIGGER validate_maintenance_schedule_company_trigger
  BEFORE INSERT OR UPDATE ON vehicle_maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION validate_maintenance_schedule_company();

-- Trigger to validate work order asset
CREATE TRIGGER validate_work_order_asset_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_work_order_asset();

-- Trigger to sync work order vehicle
CREATE TRIGGER sync_work_order_vehicle_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_order_vehicle();

-- Trigger to update parts inventory
CREATE TRIGGER update_parts_inventory_trigger
  AFTER INSERT OR UPDATE OR DELETE ON work_order_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_parts_inventory();

-- Triggers to update work order costs
CREATE TRIGGER update_work_order_parts_cost
  AFTER INSERT OR UPDATE OR DELETE ON work_order_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_work_order_costs();

CREATE TRIGGER update_work_order_labor_cost
  AFTER INSERT OR UPDATE OR DELETE ON work_order_labor
  FOR EACH ROW
  EXECUTE FUNCTION update_work_order_costs();

-- ==================== RLS POLICIES ====================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_usage ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Global admins can access all companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Users can read own company data"
  ON companies
  FOR SELECT
  TO authenticated
  USING (uid() = owner_id);

CREATE POLICY "Users can insert own company data"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = owner_id);

CREATE POLICY "Users can update own company data"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (uid() = owner_id)
  WITH CHECK (uid() = owner_id);

-- Users policies
CREATE POLICY "Allow Supabase admin access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    is_global_admin(auth.uid()) OR 
    is_supabase_admin() OR 
    id = auth.uid()
  )
  WITH CHECK (
    is_global_admin(auth.uid()) OR 
    is_supabase_admin() OR 
    id = auth.uid()
  );

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read company users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = users.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Company admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = users.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = users.company_id
      AND uc.user_id = auth.uid()
      AND uc.role = 'admin'
    )
  );

-- User companies policies
CREATE POLICY "Users can view their own company associations"
  ON user_companies
  FOR SELECT
  TO authenticated
  USING (uid() = user_id);

CREATE POLICY "Company owners can manage user associations"
  ON user_companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_companies.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- User roles policies
CREATE POLICY "Company owners can assign roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can read user roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can delete roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = user_roles.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Role permissions policies
CREATE POLICY "Company owners can create permissions"
  ON role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can read permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update permissions"
  ON role_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can delete permissions"
  ON role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = role_permissions.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- User audit logs policies
CREATE POLICY "Users can read own audit logs"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Company admins can read audit logs"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role = 'admin'
      AND uc.company_id = (
        SELECT company_id FROM users WHERE id = user_audit_logs.user_id
      )
    )
  );

CREATE POLICY "Users can create audit logs"
  ON user_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = performed_by
    AND (
      -- User can log actions for themselves
      auth.uid() = user_id
      OR
      -- Admins can log actions for users in their company
      EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
        AND uc.role = 'admin'
        AND uc.company_id = (
          SELECT company_id FROM users WHERE id = user_audit_logs.user_id
        )
      )
    )
  );

CREATE POLICY "Allow Supabase admin to create audit logs"
  ON user_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = performed_by OR
    is_supabase_admin()
  );

-- Admin audit logs policies
CREATE POLICY "Company owners can read admin audit logs"
  ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN companies c ON c.id = u.company_id
      WHERE u.id = admin_audit_logs.user_id
      AND c.owner_id = auth.uid()
    )
  );

-- Vehicles policies
CREATE POLICY "Global admins can access all vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Users can read company vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company vehicles"
  ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = vehicles.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Equipment policies
CREATE POLICY "Global admins can access all equipment"
  ON equipment
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Allow authenticated users to read equipment"
  ON equipment
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read company equipment"
  ON equipment
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = equipment.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company equipment"
  ON equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = equipment.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company equipment"
  ON equipment
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = equipment.company_id
      AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = equipment.company_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company equipment"
  ON equipment
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = equipment.company_id
      AND uc.user_id = auth.uid()
    )
  );

-- Maintenance records policies
CREATE POLICY "Allow authenticated users to read maintenance records"
  ON maintenance_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage maintenance records"
  ON maintenance_records
  FOR ALL
  TO authenticated
  USING (
    ((asset_type = 'equipment') AND (EXISTS (
      SELECT 1
      FROM equipment e
      JOIN user_companies uc ON e.company_id = uc.company_id
      WHERE e.id = maintenance_records.asset_id
      AND uc.user_id = auth.uid()
    ))) OR
    ((asset_type = 'vehicle') AND (EXISTS (
      SELECT 1
      FROM vehicles v
      JOIN user_companies uc ON v.company_id = uc.company_id
      WHERE v.id = maintenance_records.asset_id
      AND uc.user_id = auth.uid()
    )))
  )
  WITH CHECK (
    ((asset_type = 'equipment') AND (EXISTS (
      SELECT 1
      FROM equipment e
      JOIN user_companies uc ON e.company_id = uc.company_id
      WHERE e.id = maintenance_records.asset_id
      AND uc.user_id = auth.uid()
    ))) OR
    ((asset_type = 'vehicle') AND (EXISTS (
      SELECT 1
      FROM vehicles v
      JOIN user_companies uc ON v.company_id = uc.company_id
      WHERE v.id = maintenance_records.asset_id
      AND uc.user_id = auth.uid()
    )))
  );

CREATE POLICY "Users can read maintenance records"
  ON maintenance_records
  FOR SELECT
  TO authenticated
  USING (
    ((asset_type = 'equipment') AND (EXISTS (
      SELECT 1
      FROM equipment e
      JOIN user_companies uc ON e.company_id = uc.company_id
      WHERE e.id = maintenance_records.asset_id
      AND uc.user_id = auth.uid()
    ))) OR
    ((asset_type = 'vehicle') AND (EXISTS (
      SELECT 1
      FROM vehicles v
      JOIN user_companies uc ON v.company_id = uc.company_id
      WHERE v.id = maintenance_records.asset_id
      AND uc.user_id = auth.uid()
    )))
  );

-- Maintenance templates policies
CREATE POLICY "Global admins can access all maintenance templates"
  ON maintenance_templates
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

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

-- Vehicle maintenance schedules policies
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

-- Company settings policies
CREATE POLICY "Users can read company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = company_settings.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can manage settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Work orders policies
CREATE POLICY "Global admins can access all work orders"
  ON work_orders
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Users can read work orders"
  ON work_orders
  FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'view'));

CREATE POLICY "Users can create work orders"
  ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(auth.uid(), company_id, 'work_orders', 'create'));

CREATE POLICY "Users can update work orders"
  ON work_orders
  FOR UPDATE
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'edit'))
  WITH CHECK (has_permission(auth.uid(), company_id, 'work_orders', 'edit'));

CREATE POLICY "Users can delete work orders"
  ON work_orders
  FOR DELETE
  TO authenticated
  USING (has_permission(auth.uid(), company_id, 'work_orders', 'delete'));

-- Technicians policies
CREATE POLICY "Global admins can access all technicians"
  ON technicians
  FOR ALL
  TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Technicians can manage their own data"
  ON technicians
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read company technicians"
  ON technicians
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = technicians.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company technicians"
  ON technicians
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = technicians.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company technicians"
  ON technicians
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = technicians.company_id
      AND user_companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = technicians.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company technicians"
  ON technicians
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = technicians.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Work order notes policies
CREATE POLICY "work_order_notes_read_policy"
  ON work_order_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'view')
    )
  );

CREATE POLICY "work_order_notes_write_policy"
  ON work_order_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id
      AND (
        -- Allow technicians to manage their own notes
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_notes.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        -- Allow users with work order edit permission
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id
      AND (
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_notes.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  );

-- Parts inventory policies
CREATE POLICY "parts_inventory_read_policy"
  ON parts_inventory
  FOR SELECT
  TO authenticated
  USING (has_inventory_permission(auth.uid(), company_id, 'view'));

CREATE POLICY "parts_inventory_write_policy"
  ON parts_inventory
  FOR ALL
  TO authenticated
  USING (has_inventory_permission(auth.uid(), company_id, 'edit'))
  WITH CHECK (has_inventory_permission(auth.uid(), company_id, 'edit'));

-- Work order parts policies
CREATE POLICY "work_order_parts_read_policy"
  ON work_order_parts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'view')
    )
  );

CREATE POLICY "work_order_parts_write_policy"
  ON work_order_parts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_parts.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
    )
  );

-- Work order labor policies
CREATE POLICY "work_order_labor_read_policy"
  ON work_order_labor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_labor.work_order_id
      AND has_permission(auth.uid(), wo.company_id, 'work_orders', 'view')
    )
  );

CREATE POLICY "work_order_labor_write_policy"
  ON work_order_labor
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_labor.work_order_id
      AND (
        -- Allow technicians to manage their own labor entries
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_labor.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        -- Allow users with work order edit permission
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_labor.work_order_id
      AND (
        EXISTS (
          SELECT 1 FROM technicians t
          WHERE t.id = work_order_labor.technician_id
          AND t.user_id = auth.uid()
        )
        OR
        has_permission(auth.uid(), wo.company_id, 'work_orders', 'edit')
      )
    )
  );

-- Part purchases policies
CREATE POLICY "Users can read company part purchases"
  ON part_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = part_purchases.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company part purchases"
  ON part_purchases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = part_purchases.company_id
      AND user_companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = part_purchases.company_id
      AND user_companies.user_id = auth.uid()
    )
  );

-- User activity logs policies
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

-- System metrics policies
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

-- Business metrics policies
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

-- Technical metrics policies
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

-- Report schedules policies
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

-- Report access controls policies
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

-- Subscription events policies
CREATE POLICY "Company owners can read subscription events"
  ON subscription_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = subscription_events.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- User verifications policies
CREATE POLICY "Users can create verifications"
  ON user_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can read verifications"
  ON user_verifications
  FOR SELECT
  TO authenticated
  USING (
    -- Allow admins/managers to view verifications for their company
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role IN ('admin', 'manager')
      AND uc.company_id = (user_verifications.user_data->>'company_id')::uuid
    )
    OR
    -- Allow users to verify their own token
    auth.email() = email
  );

-- Equipment usage policies
CREATE POLICY "Users can manage equipment usage"
  ON equipment_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM equipment e
      JOIN user_companies uc ON e.company_id = uc.company_id
      WHERE e.id = equipment_usage.equipment_id
      AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM equipment e
      JOIN user_companies uc ON e.company_id = uc.company_id
      WHERE e.id = equipment_usage.equipment_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read equipment usage"
  ON equipment_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM equipment e
      JOIN user_companies uc ON e.company_id = uc.company_id
      WHERE e.id = equipment_usage.equipment_id
      AND uc.user_id = auth.uid()
    )
  );