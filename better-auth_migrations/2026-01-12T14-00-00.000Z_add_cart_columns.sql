-- Add additional columns to cartItems table for dimensions and file uploads
ALTER TABLE "cartItems" 
ADD COLUMN IF NOT EXISTS "widthMm" integer,
ADD COLUMN IF NOT EXISTS "heightMm" integer,
ADD COLUMN IF NOT EXISTS "uploadedFileUrl" text,
ADD COLUMN IF NOT EXISTS "uploadedFileName" text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "cartItems_createdAt_idx" ON "cartItems" ("createdAt");
CREATE INDEX IF NOT EXISTS "cartItems_updatedAt_idx" ON "cartItems" ("updatedAt");
