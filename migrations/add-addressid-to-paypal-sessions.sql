-- Add addressId column to paypalOrderSessions table
-- This stores the selected address when creating the PayPal order
ALTER TABLE "paypalOrderSessions"
ADD COLUMN IF NOT EXISTS "addressId" TEXT REFERENCES "userAddresses"(id);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_paypal_sessions_address_id ON "paypalOrderSessions"("addressId");

-- Add comment to document the column
COMMENT ON COLUMN "paypalOrderSessions"."addressId" IS 'Reference to the user address selected at checkout';
