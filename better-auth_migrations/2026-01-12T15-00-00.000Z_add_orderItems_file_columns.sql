-- Add file upload columns to orderItems table to store customer-uploaded design files
ALTER TABLE "orderItems"
ADD COLUMN IF NOT EXISTS "uploadedFileUrl" text,
ADD COLUMN IF NOT EXISTS "uploadedFileName" text;

-- Add index for better query performance when filtering by uploaded files
CREATE INDEX IF NOT EXISTS "orderItems_uploadedFileUrl_idx" ON "orderItems" ("uploadedFileUrl") WHERE "uploadedFileUrl" IS NOT NULL;
