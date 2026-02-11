-- Migration: Create tempUploadedFiles table for tracking temporary file uploads
-- Purpose: Track files uploaded during checkout before payment is completed
-- Files are migrated to permanent storage after successful payment

CREATE TABLE IF NOT EXISTS "tempUploadedFiles" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "sessionId" TEXT NOT NULL,           -- PayPal order ID or cart session for tracking
  "tempFileUrl" TEXT NOT NULL,         -- R2 URL in temp-uploads/ folder
  "fileName" TEXT NOT NULL,            -- Original filename
  "fileSize" INTEGER NOT NULL,         -- File size in bytes
  "fileType" TEXT NOT NULL,            -- File type (pdf, png, jpg, etc.)
  "fileMetadata" JSONB,                -- JSON metadata: {width, height, dpi, warnings}
  "permanentFileUrl" TEXT,             -- Set after migration to permanent storage
  "isMigrated" BOOLEAN DEFAULT FALSE,  -- TRUE after successful migration
  "migratedAt" TIMESTAMP,              -- Timestamp of migration
  "orderId" TEXT REFERENCES orders(id) ON DELETE SET NULL,  -- Associated order after migration
  "expiresAt" TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),  -- Auto-expire after 24h
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_temp_files_user ON "tempUploadedFiles"("userId");
CREATE INDEX IF NOT EXISTS idx_temp_files_session ON "tempUploadedFiles"("sessionId");
CREATE INDEX IF NOT EXISTS idx_temp_files_expires ON "tempUploadedFiles"("expiresAt")
  WHERE "isMigrated" = FALSE;  -- Partial index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_temp_files_order ON "tempUploadedFiles"("orderId")
  WHERE "orderId" IS NOT NULL;  -- Index for order lookups

-- Comment explaining the table
COMMENT ON TABLE "tempUploadedFiles" IS 'Tracks temporary file uploads during checkout. Files are migrated to permanent storage after payment completion and deleted after 24 hours if abandoned.';
