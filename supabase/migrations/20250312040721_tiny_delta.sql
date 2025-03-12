/*
  # Create user_companies junction table

  1. New Tables
    - `user_companies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users.id)
      - `company_id` (uuid, references companies.id)
      - `role` (text) - user's role in the company
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on user_companies table
    - Add policies for:
      - Users can read companies they belong to
      - Company owners can manage user associations
      - Users can view their own company associations

  3. Changes
    - Add composite unique constraint to prevent duplicate user-company pairs
    - Add indexes for performance
*/

-- Create user_companies junction table
CREATE TABLE IF NOT EXISTS user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Policies for user_companies
CREATE POLICY "Users can view their own company associations"
  ON user_companies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_role ON user_companies(role);

-- Automatically add company owner to user_companies when a company is created
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_companies (user_id, company_id, role)
  VALUES (NEW.owner_id, NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_company();

-- Add helper function to check if a user belongs to a company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(user_uuid uuid, company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = user_uuid
    AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;