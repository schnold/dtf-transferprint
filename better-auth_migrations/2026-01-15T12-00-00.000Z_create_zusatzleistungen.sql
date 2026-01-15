-- ============================================
-- Zusatzleistungen (Additional Services) Feature
-- Created: 2026-01-15
-- ============================================

-- 1. Global Zusatzleistungen Table
-- Stores all available additional services that can be assigned to products
CREATE TABLE IF NOT EXISTS "zusatzleistungen" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10, 2) NOT NULL CHECK ("price" >= 0),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for active services sorted by display order
CREATE INDEX IF NOT EXISTS "zusatzleistungen_active_idx" ON "zusatzleistungen" ("isActive", "displayOrder");

-- 2. Product-Zusatzleistungen Junction Table
-- Controls which zusatzleistungen are enabled for which products
CREATE TABLE IF NOT EXISTS "productZusatzleistungen" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
  "zusatzleistungId" TEXT NOT NULL REFERENCES "zusatzleistungen" ("id") ON DELETE CASCADE,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("productId", "zusatzleistungId")
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "productZusatzleistungen_productId_idx" ON "productZusatzleistungen" ("productId");
CREATE INDEX IF NOT EXISTS "productZusatzleistungen_zusatzleistungId_idx" ON "productZusatzleistungen" ("zusatzleistungId");
CREATE INDEX IF NOT EXISTS "productZusatzleistungen_enabled_idx" ON "productZusatzleistungen" ("productId", "isEnabled");

-- 3. Cart Item Zusatzleistungen Junction Table
-- Tracks which zusatzleistungen were selected for each cart item
-- Price is stored as snapshot to prevent retroactive price changes
CREATE TABLE IF NOT EXISTS "cartItemZusatzleistungen" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cartItemId" TEXT NOT NULL REFERENCES "cartItems" ("id") ON DELETE CASCADE,
  "zusatzleistungId" TEXT NOT NULL REFERENCES "zusatzleistungen" ("id") ON DELETE RESTRICT,
  "price" DECIMAL(10, 2) NOT NULL CHECK ("price" >= 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("cartItemId", "zusatzleistungId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "cartItemZusatzleistungen_cartItemId_idx" ON "cartItemZusatzleistungen" ("cartItemId");
CREATE INDEX IF NOT EXISTS "cartItemZusatzleistungen_zusatzleistungId_idx" ON "cartItemZusatzleistungen" ("zusatzleistungId");

-- 4. Order Item Zusatzleistungen Table
-- Stores zusatzleistungen in completed orders (denormalized for historical record)
-- Name and description are stored directly to preserve history even if service is deleted
CREATE TABLE IF NOT EXISTS "orderItemZusatzleistungen" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderItemId" TEXT NOT NULL REFERENCES "orderItems" ("id") ON DELETE CASCADE,
  "zusatzleistungName" TEXT NOT NULL,
  "zusatzleistungDescription" TEXT,
  "price" DECIMAL(10, 2) NOT NULL CHECK ("price" >= 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "orderItemZusatzleistungen_orderItemId_idx" ON "orderItemZusatzleistungen" ("orderItemId");

-- ============================================
-- Seed Data
-- ============================================

-- Insert initial service: Profi Datencheck
INSERT INTO "zusatzleistungen" (id, name, description, price, "isActive", "displayOrder")
VALUES (
  gen_random_uuid()::text,
  'Profi Datencheck',
  'Professionelle Überprüfung Ihrer Designdatei vor der Produktion',
  20.00,
  true,
  1
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Migration Complete
-- ============================================
-- This migration creates the complete zusatzleistungen system:
-- - Global services management
-- - Per-product service enabling/disabling
-- - Cart item service tracking with price snapshots
-- - Order history preservation
