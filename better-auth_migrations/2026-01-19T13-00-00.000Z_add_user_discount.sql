-- Add user-specific discount field
-- This allows admins to set a percentage discount for specific users

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "discountPercent" numeric(5,2) DEFAULT 0;

-- Add constraint to ensure discount is between 0 and 100
ALTER TABLE "user" ADD CONSTRAINT "user_discount_percent_check"
  CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100);

COMMENT ON COLUMN "user"."discountPercent" IS 'User-specific discount percentage (0-100) applied to final price';
