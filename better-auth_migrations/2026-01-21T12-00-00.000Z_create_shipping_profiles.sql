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

-- Add unique constraint on name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'shippingProfiles_name_key' 
        AND conrelid = '"shippingProfiles"'::regclass
    ) THEN
        -- First, clean up any duplicate shipping profiles (keep only the oldest one per name)
        DELETE FROM "shippingProfiles" a
        USING "shippingProfiles" b
        WHERE a.id > b.id 
          AND a.name = b.name;
        
        -- Now add the unique constraint
        ALTER TABLE "shippingProfiles" ADD CONSTRAINT "shippingProfiles_name_key" UNIQUE (name);
    END IF;
END $$;

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

-- Insert default shipping profiles (will skip if they already exist due to UNIQUE constraint)
INSERT INTO "shippingProfiles" (id, name, description, "basePrice", "freeShippingThreshold", "estimatedDays", "isActive", "isDefault", "displayOrder")
VALUES
    (gen_random_uuid()::text, 'Standard Versand', 'Standardversand innerhalb Deutschlands', 4.99, 50.00, 3, true, true, 1),
    (gen_random_uuid()::text, 'Express Versand', 'Expressversand innerhalb 1-2 Werktagen', 9.99, NULL, 1, true, false, 2),
    (gen_random_uuid()::text, 'Premium Versand', 'Premium Versand mit Sendungsverfolgung', 14.99, 100.00, 2, true, false, 3)
ON CONFLICT (name) DO NOTHING;

-- Add shipping profile column to orders table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shippingProfileId') THEN
        ALTER TABLE orders ADD COLUMN "shippingProfileId" TEXT REFERENCES "shippingProfiles"(id);
    END IF;
END $$;
