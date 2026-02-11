-- Migration: Add Product Inquiry Features
-- Adds ability to disable cart/checkout for products and require inquiry form instead
-- Date: 2026-01-26

-- ============================================
-- Add requiresInquiry column to products table
-- ============================================
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "requiresInquiry" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "products"."requiresInquiry" IS 'When true, product cannot be added to cart/checkout. Customer must submit inquiry form instead.';

-- Create index for filtering products by inquiry requirement
CREATE INDEX IF NOT EXISTS "products_requiresInquiry_idx" ON "products" ("requiresInquiry");

-- ============================================
-- Add product linking columns to form_requests
-- ============================================
ALTER TABLE form_requests
ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES "products" ("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS product_name TEXT;

COMMENT ON COLUMN form_requests.product_id IS 'Links to product if this is a product inquiry (form_type = produktanfrage)';
COMMENT ON COLUMN form_requests.product_name IS 'Stores product name at time of inquiry for reference even if product is deleted';

-- Create index for filtering product inquiries
CREATE INDEX IF NOT EXISTS idx_form_requests_product_id ON form_requests(product_id);
