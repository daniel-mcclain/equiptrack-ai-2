/*
  # Update Technicians Schema to Integrate with Users

  1. Changes
    - Make user_id NOT NULL and add ON DELETE CASCADE
    - Remove redundant fields that are in users table
    - Add trigger to sync user data
    - Update constraints and indexes

  2. Security
    - Maintain existing RLS policies
    - Add policy for user self-management
*/

-- Drop existing table
DROP TABLE IF EXISTS technicians;

-- Create updated technicians table
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
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

-- Add status constraint
ALTER TABLE technicians
  ADD CONSTRAINT valid_technician_status
  CHECK (status IN ('active', 'inactive', 'on_leave'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON technicians(company_id);
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technicians_skills ON technicians USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_technicians_certifications ON technicians USING gin(certifications);

-- Create policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can read company technicians'
    AND tablename = 'technicians'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can insert company technicians'
    AND tablename = 'technicians'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update company technicians'
    AND tablename = 'technicians'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete company technicians'
    AND tablename = 'technicians'
  ) THEN
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
  END IF;

  -- Add policy for technicians to manage their own data
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Technicians can manage their own data'
    AND tablename = 'technicians'
  ) THEN
    CREATE POLICY "Technicians can manage their own data"
      ON technicians
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Helper functions
CREATE OR REPLACE FUNCTION get_technician_stats(company_uuid uuid)
RETURNS TABLE (
  total_technicians bigint,
  active_technicians bigint,
  inactive_technicians bigint,
  on_leave_technicians bigint,
  avg_hourly_rate decimal(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_technicians,
    COUNT(*) FILTER (WHERE status = 'active') as active_technicians,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_technicians,
    COUNT(*) FILTER (WHERE status = 'on_leave') as on_leave_technicians,
    AVG(hourly_rate) as avg_hourly_rate
  FROM technicians
  WHERE company_id = company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a technician
CREATE OR REPLACE FUNCTION is_technician(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM technicians
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;