-- Add file requirement columns to products table for print quality validation
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "requiredDpi" integer DEFAULT 300,
ADD COLUMN IF NOT EXISTS "requiredMinWidth" integer,
ADD COLUMN IF NOT EXISTS "requiredMinHeight" integer,
ADD COLUMN IF NOT EXISTS "allowedFileTypes" text DEFAULT 'pdf,png';

-- Update existing products to have default file requirements
UPDATE "products"
SET "requiredDpi" = 300,
    "allowedFileTypes" = 'pdf,png'
WHERE "requiredDpi" IS NULL;

-- Add metadata columns to cartItems to store file quality info
ALTER TABLE "cartItems"
ADD COLUMN IF NOT EXISTS "fileMetadata" jsonb;

-- Add metadata columns to orderItems to store file quality info
ALTER TABLE "orderItems"
ADD COLUMN IF NOT EXISTS "fileMetadata" jsonb;

-- Add comments for documentation
COMMENT ON COLUMN "products"."requiredDpi" IS 'Minimum DPI required for print quality (default: 300)';
COMMENT ON COLUMN "products"."requiredMinWidth" IS 'Minimum width in pixels for uploaded files';
COMMENT ON COLUMN "products"."requiredMinHeight" IS 'Minimum height in pixels for uploaded files';
COMMENT ON COLUMN "products"."allowedFileTypes" IS 'Comma-separated list of allowed file types (e.g., pdf,png)';
COMMENT ON COLUMN "cartItems"."fileMetadata" IS 'JSON metadata about uploaded file: {width, height, dpi, fileType, meetsRequirements, warnings}';
COMMENT ON COLUMN "orderItems"."fileMetadata" IS 'JSON metadata about uploaded file: {width, height, dpi, fileType, meetsRequirements, warnings}';
