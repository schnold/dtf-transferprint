-- Add business-related fields to user table
-- Gewerbebetreiber (boolean) - confirms user is a business operator
-- Umsatzsteuernummer (VAT number) - German VAT ID

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "gewerbebetreiber" boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "umsatzsteuernummer" text;

-- Add constraint to ensure VAT number format if provided (German format: DE followed by 9 digits)
-- This is a soft check - the main validation happens in the application layer
COMMENT ON COLUMN "user"."gewerbebetreiber" IS 'Confirms user is a registered business operator (required for signup)';
COMMENT ON COLUMN "user"."umsatzsteuernummer" IS 'German VAT number (Umsatzsteuer-Identifikationsnummer), format: DE + 9 digits';
