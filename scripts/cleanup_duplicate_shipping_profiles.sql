-- ========================================
-- Cleanup Script for Duplicate Shipping Profiles
-- ========================================
-- This script removes duplicate shipping profiles, keeping only the oldest one per name

BEGIN;

-- Show duplicates before cleanup
SELECT name, COUNT(*) as count
FROM "shippingProfiles"
GROUP BY name
HAVING COUNT(*) > 1;

-- Delete duplicate profiles (keep the oldest one based on createdAt)
DELETE FROM "shippingProfiles" a
USING (
    SELECT name, MIN("createdAt") as oldest_created_at
    FROM "shippingProfiles"
    GROUP BY name
    HAVING COUNT(*) > 1
) b
WHERE a.name = b.name 
  AND a."createdAt" > b.oldest_created_at;

-- Show remaining profiles
SELECT id, name, "basePrice", "isActive", "isDefault", "createdAt"
FROM "shippingProfiles"
ORDER BY "displayOrder", "createdAt";

COMMIT;

-- After cleanup, you can add the unique constraint manually:
-- ALTER TABLE "shippingProfiles" ADD CONSTRAINT "shippingProfiles_name_key" UNIQUE (name);
