/*
  # Add User Verifications Table

  1. New Tables
    - user_verifications
      - Store verification tokens and user data
      - Handle email verification process
      - Track token expiration

  2. Security
    - Enable RLS
    - Add policies for secure token verification
*/

-- Create user_verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  user_data jsonb NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_user_verifications_token ON user_verifications(token);
CREATE INDEX idx_user_verifications_email ON user_verifications(email);
CREATE INDEX idx_user_verifications_expires_at ON user_verifications(expires_at);

-- Create policy for token verification
CREATE POLICY "Allow token verification"
  ON user_verifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to verify token
CREATE OR REPLACE FUNCTION verify_user_token(token text)
RETURNS jsonb AS $$
DECLARE
  v_verification user_verifications;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get verification record
  SELECT * INTO v_verification
  FROM user_verifications
  WHERE token = verify_user_token.token
  AND verified_at IS NULL
  AND expires_at > now();

  IF v_verification IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  -- Create user account
  INSERT INTO auth.users (
    email,
    raw_user_meta_data
  ) VALUES (
    v_verification.email,
    v_verification.user_data
  )
  RETURNING id INTO v_user_id;

  -- Mark token as verified
  UPDATE user_verifications
  SET 
    verified_at = now(),
    user_data = user_data || jsonb_build_object('user_id', v_user_id)
  WHERE id = v_verification.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_verification.email,
    'user_data', v_verification.user_data
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resend verification
CREATE OR REPLACE FUNCTION resend_verification(email text)
RETURNS jsonb AS $$
DECLARE
  v_verification user_verifications;
  v_new_token text;
  v_expires_at timestamptz;
BEGIN
  -- Get existing unverified token
  SELECT * INTO v_verification
  FROM user_verifications
  WHERE email = resend_verification.email
  AND verified_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_verification IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No verification request found'
    );
  END IF;

  -- Generate new token
  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '24 hours';

  -- Update verification record
  UPDATE user_verifications
  SET
    token = v_new_token,
    expires_at = v_expires_at
  WHERE id = v_verification.id;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_new_token,
    'expires_at', v_expires_at
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;