create table "products" (
  "id" text not null primary key,
  "slug" text not null unique,
  "name" text not null,
  "shortDescription" text not null,
  "description" text not null,
  "categoryId" text not null references "categories" ("id") on delete restrict,
  "basePrice" decimal(10, 2) not null check ("basePrice" >= 0),
  "compareAtPrice" decimal(10, 2) check ("compareAtPrice" >= 0),
  "costPerItem" decimal(10, 2) check ("costPerItem" >= 0),
  "sku" text,
  "barcode" text,
  "trackInventory" boolean not null default true,
  "inventoryQuantity" integer not null default 0,
  "inventoryPolicy" text not null default 'deny' check ("inventoryPolicy" in ('deny', 'continue')),
  "lowStockThreshold" integer default 10,
  "weight" decimal(10, 2),
  "weightUnit" text default 'g' check ("weightUnit" in ('g', 'kg', 'lb', 'oz')),
  "requiresShipping" boolean not null default true,
  "isActive" boolean not null default true,
  "isFeatured" boolean not null default false,
  "searchKeywords" text,
  "metaTitle" text,
  "metaDescription" text,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "products_slug_idx" on "products" ("slug");
create index "products_categoryId_idx" on "products" ("categoryId");
create index "products_isActive_idx" on "products" ("isActive");
create index "products_isFeatured_idx" on "products" ("isFeatured");
create index "products_createdAt_idx" on "products" ("createdAt" desc);
create index "products_search_idx" on "products" using gin(to_tsvector('english', "name" || ' ' || "description" || ' ' || coalesce("searchKeywords", '')));

create table "productImages" (
  "id" text not null primary key,
  "productId" text not null references "products" ("id") on delete cascade,
  "url" text not null,
  "altText" text,
  "displayOrder" integer not null default 0,
  "isPrimary" boolean not null default false,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "productImages_productId_idx" on "productImages" ("productId");
create index "productImages_displayOrder_idx" on "productImages" ("productId", "displayOrder");

create table "productSpecifications" (
  "id" text not null primary key,
  "productId" text not null references "products" ("id") on delete cascade,
  "specKey" text not null,
  "specLabel" text not null,
  "specValue" text not null,
  "displayOrder" integer not null default 0,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "productSpecifications_productId_idx" on "productSpecifications" ("productId");
create unique index "productSpecifications_unique_idx" on "productSpecifications" ("productId", "specKey");

create table "productTags" (
  "id" text not null primary key,
  "name" text not null unique,
  "slug" text not null unique,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create table "productTagRelations" (
  "productId" text not null references "products" ("id") on delete cascade,
  "tagId" text not null references "productTags" ("id") on delete cascade,
  primary key ("productId", "tagId")
);

create index "productTagRelations_productId_idx" on "productTagRelations" ("productId");
create index "productTagRelations_tagId_idx" on "productTagRelations" ("tagId");

create table "productReviews" (
  "id" text not null primary key,
  "productId" text not null references "products" ("id") on delete cascade,
  "userId" text not null references "user" ("id") on delete cascade,
  "rating" integer not null check ("rating" >= 1 and "rating" <= 5),
  "title" text,
  "comment" text not null,
  "isVerifiedPurchase" boolean not null default false,
  "isApproved" boolean not null default false,
  "helpfulCount" integer not null default 0,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "productReviews_productId_idx" on "productReviews" ("productId");
create index "productReviews_userId_idx" on "productReviews" ("userId");
create index "productReviews_isApproved_idx" on "productReviews" ("isApproved");
create index "productReviews_createdAt_idx" on "productReviews" ("createdAt" desc);
create unique index "productReviews_unique_user_product_idx" on "productReviews" ("userId", "productId");
