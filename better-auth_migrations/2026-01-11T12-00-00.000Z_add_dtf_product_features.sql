-- ============================================
-- Add DTF-specific product features
-- ============================================

-- Extend products table with DTF-specific fields
alter table "products"
  add column "maxWidthMm" integer,
  add column "minHeightMm" integer,
  add column "maxHeightMm" integer,
  add column "acceptsFileUpload" boolean not null default false,
  add column "maxFileSizeMb" integer default 255,
  add column "allowedFileTypes" text default 'PDF',
  add column "priceCalculationMethod" text default 'per_piece' check ("priceCalculationMethod" in ('per_piece', 'per_area', 'per_meter')),
  add column "isBlockout" boolean not null default false,
  add column "printTechnology" text default 'DTF';

-- Create price tiers table for quantity-based pricing
create table "priceTiers" (
  "id" text not null primary key,
  "productId" text not null references "products" ("id") on delete cascade,
  "minQuantity" integer not null check ("minQuantity" >= 0),
  "maxQuantity" integer check ("maxQuantity" is null or "maxQuantity" >= "minQuantity"),
  "discountPercent" decimal(5,2) not null check ("discountPercent" >= 0 and "discountPercent" <= 100),
  "pricePerUnit" decimal(10, 2) not null check ("pricePerUnit" >= 0),
  "displayOrder" integer not null default 0,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "priceTiers_productId_idx" on "priceTiers" ("productId");
create index "priceTiers_displayOrder_idx" on "priceTiers" ("productId", "displayOrder");

-- Create related products table
create table "relatedProducts" (
  "id" text not null primary key,
  "productId" text not null references "products" ("id") on delete cascade,
  "relatedProductId" text not null references "products" ("id") on delete cascade,
  "displayOrder" integer not null default 0,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "relatedProducts_productId_idx" on "relatedProducts" ("productId");
create unique index "relatedProducts_unique_idx" on "relatedProducts" ("productId", "relatedProductId");

-- Add reseller fields to user table (if not exists)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'user' and column_name = 'isReseller') then
    alter table "user" add column "isReseller" boolean not null default false;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'user' and column_name = 'resellerDiscountPercent') then
    alter table "user" add column "resellerDiscountPercent" decimal(5,2) not null default 0 check ("resellerDiscountPercent" >= 0 and "resellerDiscountPercent" <= 100);
  end if;
end $$;

-- Extend cartItems to support file uploads and dimensions
alter table "cartItems"
  add column "widthMm" integer,
  add column "heightMm" integer,
  add column "uploadedFileUrl" text,
  add column "uploadedFileName" text;

-- Update unique constraint for cart items to allow multiple items with same product but different configs
drop index if exists "cartItems_unique_idx";
create index "cartItems_product_user_idx" on "cartItems" ("userId", "productId");

-- Extend orderItems to support file uploads and dimensions
alter table "orderItems"
  add column "widthMm" integer,
  add column "heightMm" integer,
  add column "uploadedFileUrl" text,
  add column "uploadedFileName" text,
  add column "discountPercent" decimal(5,2) default 0;

-- ============================================
-- Functions for price calculation
-- ============================================

-- Function to get applicable price tier for a quantity
create or replace function get_price_for_quantity(
  p_product_id text,
  p_quantity integer
) returns table (
  "unitPrice" decimal(10,2),
  "discountPercent" decimal(5,2),
  "tierId" text
) as $$
begin
  return query
  select
    pt."pricePerUnit",
    pt."discountPercent",
    pt."id"
  from "priceTiers" pt
  where pt."productId" = p_product_id
    and p_quantity >= pt."minQuantity"
    and (pt."maxQuantity" is null or p_quantity <= pt."maxQuantity")
  order by pt."minQuantity" desc
  limit 1;
end;
$$ language plpgsql;

-- Function to calculate line total with reseller discount
create or replace function calculate_line_total(
  p_product_id text,
  p_quantity integer,
  p_user_id text default null
) returns decimal(10,2) as $$
declare
  v_unit_price decimal(10,2);
  v_reseller_discount decimal(5,2) := 0;
  v_line_total decimal(10,2);
  v_base_price decimal(10,2);
begin
  -- Get unit price for quantity from price tiers
  select "unitPrice" into v_unit_price
  from get_price_for_quantity(p_product_id, p_quantity);

  -- If no price tier found, use base price
  if v_unit_price is null then
    select "basePrice" into v_unit_price
    from "products"
    where "id" = p_product_id;
  end if;

  -- Get reseller discount if user is a reseller
  if p_user_id is not null then
    select "resellerDiscountPercent" into v_reseller_discount
    from "user"
    where "id" = p_user_id and "isReseller" = true;

    if v_reseller_discount is null then
      v_reseller_discount := 0;
    end if;
  end if;

  -- Calculate total
  v_line_total := v_unit_price * p_quantity;

  -- Apply reseller discount
  if v_reseller_discount > 0 then
    v_line_total := v_line_total * (1 - v_reseller_discount / 100);
  end if;

  return round(v_line_total, 2);
end;
$$ language plpgsql;

-- ============================================
-- Views for easier querying
-- ============================================

-- View for category tree with full path
create or replace view "categoryTree" as
with recursive category_hierarchy as (
  select
    "id",
    "name",
    "slug",
    "parentId",
    "displayOrder",
    "isActive",
    "name"::text as "fullPath",
    0 as "level"
  from "categories"
  where "parentId" is null

  union all

  select
    c."id",
    c."name",
    c."slug",
    c."parentId",
    c."displayOrder",
    c."isActive",
    ch."fullPath" || ' > ' || c."name",
    ch."level" + 1
  from "categories" c
  inner join category_hierarchy ch on c."parentId" = ch."id"
)
select * from category_hierarchy;
