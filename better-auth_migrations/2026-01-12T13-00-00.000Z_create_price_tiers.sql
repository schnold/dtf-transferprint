-- Create priceTiers table for volume-based pricing
create table if not exists "priceTiers" (
  "id" text not null primary key,
  "productId" text not null references "products" ("id") on delete cascade,
  "minQuantity" integer not null check ("minQuantity" >= 0),
  "maxQuantity" integer check ("maxQuantity" is null or "maxQuantity" > "minQuantity"),
  "discountPercent" decimal(5, 2) not null default 0 check ("discountPercent" >= 0 and "discountPercent" <= 100),
  "pricePerUnit" decimal(10, 2) not null check ("pricePerUnit" >= 0),
  "displayOrder" integer not null default 0,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index if not exists "priceTiers_productId_idx" on "priceTiers" ("productId");
create index if not exists "priceTiers_displayOrder_idx" on "priceTiers" ("productId", "displayOrder");
create index if not exists "priceTiers_quantity_idx" on "priceTiers" ("productId", "minQuantity", "maxQuantity");

-- Add priceCalculationMethod to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'priceCalculationMethod'
  ) THEN
    ALTER TABLE "products" ADD COLUMN "priceCalculationMethod" text not null default 'per_piece'
      check ("priceCalculationMethod" in ('per_piece', 'per_meter', 'per_area'));
  END IF;
END $$;
