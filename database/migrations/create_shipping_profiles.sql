-- Create shipping profiles table
CREATE TABLE IF NOT EXISTS "shippingProfiles" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    "basePrice" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "freeShippingThreshold" DECIMAL(10, 2),
    "estimatedDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active profiles
CREATE INDEX IF NOT EXISTS idx_shipping_profiles_active ON "shippingProfiles"("isActive", "displayOrder");

-- Create user cart shipping selection table
CREATE TABLE IF NOT EXISTS "userCartShipping" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "shippingProfileId" TEXT NOT NULL REFERENCES "shippingProfiles"(id) ON DELETE CASCADE,
    "selectedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId")
);

-- Create index for user shipping selection
CREATE INDEX IF NOT EXISTS idx_user_cart_shipping_user ON "userCartShipping"("userId");

-- Insert default shipping profiles
INSERT INTO "shippingProfiles" (id, name, description, "basePrice", "freeShippingThreshold", "estimatedDays", "isActive", "isDefault", "displayOrder")
VALUES
    (gen_random_uuid()::text, 'Standard Versand', 'Standardversand innerhalb Deutschlands', 4.99, 50.00, 3, true, true, 1),
    (gen_random_uuid()::text, 'Express Versand', 'Expressversand innerhalb 1-2 Werktagen', 9.99, NULL, 1, true, false, 2),
    (gen_random_uuid()::text, 'Premium Versand', 'Premium Versand mit Sendungsverfolgung', 14.99, 100.00, 2, true, false, 3)
ON CONFLICT DO NOTHING;

-- Add shipping profile column to orders table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shippingProfileId') THEN
        ALTER TABLE orders ADD COLUMN "shippingProfileId" TEXT REFERENCES "shippingProfiles"(id);
    END IF;
END $$;
