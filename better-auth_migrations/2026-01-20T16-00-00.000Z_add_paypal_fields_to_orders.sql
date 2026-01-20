-- Add PayPal fields to orders table for payment tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "userDiscountPercent" NUMERIC(5,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT;

-- Add index for PayPal order lookup
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders("paypalOrderId");

-- Add comments to document the new fields
COMMENT ON COLUMN orders."userDiscountPercent" IS 'User-specific discount percentage applied to this order';
COMMENT ON COLUMN orders."paypalOrderId" IS 'PayPal order ID for payment tracking';
COMMENT ON COLUMN orders."paypalCaptureId" IS 'PayPal capture ID for payment verification and refunds';
