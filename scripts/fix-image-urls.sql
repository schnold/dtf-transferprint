-- Fix existing product image URLs to include the product-images/ prefix
-- This script updates URLs that don't already have a folder prefix

-- Update product images
UPDATE "productImages"
SET url = 'product-images/' || REPLACE(url, '/api/images/', '')
WHERE url LIKE '/api/images/%'
  AND url NOT LIKE '/api/images/product-images/%'
  AND url NOT LIKE '/api/images/category-images/%'
  AND url NOT LIKE '/api/images/branding/%'
  AND url NOT LIKE '/api/images/public-assets/%'
  AND url NOT LIKE '/api/images/design-files/%';

-- Alternative: if URLs don't have /api/images/ prefix
UPDATE "productImages"
SET url = '/api/images/product-images/' || url
WHERE url NOT LIKE '/api/images/%'
  AND url NOT LIKE 'http%'; -- Don't touch external URLs

-- Update category images if they exist
UPDATE categories
SET "imageUrl" = '/api/images/category-images/' || REPLACE("imageUrl", '/api/images/', '')
WHERE "imageUrl" LIKE '/api/images/%'
  AND "imageUrl" NOT LIKE '/api/images/product-images/%'
  AND "imageUrl" NOT LIKE '/api/images/category-images/%'
  AND "imageUrl" NOT LIKE '/api/images/branding/%'
  AND "imageUrl" NOT LIKE '/api/images/public-assets/%'
  AND "imageUrl" NOT LIKE '/api/images/design-files/%';

-- Alternative for categories
UPDATE categories
SET "imageUrl" = '/api/images/category-images/' || "imageUrl"
WHERE "imageUrl" IS NOT NULL
  AND "imageUrl" NOT LIKE '/api/images/%'
  AND "imageUrl" NOT LIKE 'http%';

-- Show what was updated
SELECT 'Product images updated:' as info, COUNT(*) as count
FROM "productImages"
WHERE url LIKE '/api/images/product-images/%';

SELECT 'Category images updated:' as info, COUNT(*) as count
FROM categories
WHERE "imageUrl" LIKE '/api/images/category-images/%';
