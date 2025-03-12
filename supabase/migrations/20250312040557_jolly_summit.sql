/*
  # Create users table with auth and company relationships

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches auth.users id
      - `first_name` (text)
      - `last_name` (text)
      - `avatar_url` (text, nullable)
      - `phone` (text, nullable)
      - `role` (text) - user role in the system
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on users table
    - Add policies for authenticated users to:
      - Read their own user data
      - Update their own user data
    - Add trigger to automatically create user profile when auth user is created

  3. Changes
    - Add foreign key from companies to users table
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update companies table to reference users instead of auth.users
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_owner_id_fkey,
  ADD CONSTRAINT companies_owner_id_fkey 
    FOREIGN KEY (owner_id) 
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS users_first_name_idx ON users (first_name);
CREATE INDEX IF NOT EXISTS users_last_name_idx ON users (last_name);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);