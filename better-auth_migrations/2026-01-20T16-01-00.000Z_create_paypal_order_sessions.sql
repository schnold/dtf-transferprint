-- Create PayPal order sessions table for secure payment tracking
CREATE TABLE IF NOT EXISTS "paypalOrderSessions" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "paypalOrderId" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "cartSnapshot" JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    "userDiscountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0,
    "userDiscountAmount" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "campaignDiscountAmount" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "discountCode" TEXT,
    "discountId" TEXT REFERENCES discounts(id),
    "shippingCost" NUMERIC(10,2) NOT NULL,
    "shippingProfileId" TEXT REFERENCES "shippingProfiles"(id),
    "taxAmount" NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    captured BOOLEAN DEFAULT false,
    "capturedAt" TIMESTAMP,
    "orderId" TEXT REFERENCES orders(id),
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_paypal_sessions_paypal_order_id ON "paypalOrderSessions"("paypalOrderId");
CREATE INDEX IF NOT EXISTS idx_paypal_sessions_user_id ON "paypalOrderSessions"("userId");
CREATE INDEX IF NOT EXISTS idx_paypal_sessions_captured ON "paypalOrderSessions"(captured);
CREATE INDEX IF NOT EXISTS idx_paypal_sessions_expires_at ON "paypalOrderSessions"("expiresAt");

-- Add comments to document the table
COMMENT ON TABLE "paypalOrderSessions" IS 'Stores PayPal order session data for secure payment processing and validation';
COMMENT ON COLUMN "paypalOrderSessions"."cartSnapshot" IS 'JSON snapshot of cart items at time of PayPal order creation';
COMMENT ON COLUMN "paypalOrderSessions"."userDiscountPercent" IS 'User-specific discount percentage applied';
COMMENT ON COLUMN "paypalOrderSessions"."userDiscountAmount" IS 'Calculated user discount amount in EUR';
COMMENT ON COLUMN "paypalOrderSessions"."campaignDiscountAmount" IS 'Calculated campaign discount amount in EUR';
COMMENT ON COLUMN "paypalOrderSessions".captured IS 'Whether the PayPal payment has been captured';
COMMENT ON COLUMN "paypalOrderSessions"."expiresAt" IS 'Session expiration time (typically 3 hours from creation)';
