/*
  # Update companies table address fields

  1. Changes
    - Split address field into separate components:
      - street_address
      - city
      - state
      - zip_code
    - Remove old address column

  2. Security
    - Existing RLS policies remain unchanged
*/

DO $$ 
BEGIN
  -- Add new address columns
  ALTER TABLE companies
    ADD COLUMN street_address text,
    ADD COLUMN city text,
    ADD COLUMN state text,
    ADD COLUMN zip_code text;

  -- Copy existing address data if needed (optional)
  -- UPDATE companies SET street_address = address;

  -- Make new columns NOT NULL
  ALTER TABLE companies
    ALTER COLUMN street_address SET NOT NULL,
    ALTER COLUMN city SET NOT NULL,
    ALTER COLUMN state SET NOT NULL,
    ALTER COLUMN zip_code SET NOT NULL;

  -- Remove old address column
  ALTER TABLE companies DROP COLUMN IF EXISTS address;
END $$;