create table "discounts" (
  "id" text not null primary key,
  "code" text not null unique,
  "description" text,
  "discountType" text not null check ("discountType" in ('percentage', 'fixed_amount', 'free_shipping')),
  "discountValue" decimal(10, 2) not null check ("discountValue" >= 0),
  "minPurchaseAmount" decimal(10, 2) check ("minPurchaseAmount" >= 0),
  "maxDiscountAmount" decimal(10, 2) check ("maxDiscountAmount" >= 0),
  "usageLimit" integer,
  "usageCount" integer not null default 0,
  "usageLimitPerUser" integer,
  "appliesTo" text not null default 'all' check ("appliesTo" in ('all', 'specific_products', 'specific_categories')),
  "isActive" boolean not null default true,
  "startsAt" timestamptz not null,
  "endsAt" timestamptz,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP,
  constraint "valid_percentage" check (
    "discountType" != 'percentage' or ("discountValue" >= 0 and "discountValue" <= 100)
  )
);

create index "discounts_code_idx" on "discounts" ("code");
create index "discounts_isActive_idx" on "discounts" ("isActive");
create index "discounts_dates_idx" on "discounts" ("startsAt", "endsAt");

create table "discountProductEligibility" (
  "discountId" text not null references "discounts" ("id") on delete cascade,
  "productId" text not null references "products" ("id") on delete cascade,
  primary key ("discountId", "productId")
);

create table "discountCategoryEligibility" (
  "discountId" text not null references "discounts" ("id") on delete cascade,
  "categoryId" text not null references "categories" ("id") on delete cascade,
  primary key ("discountId", "categoryId")
);

create table "discountUsage" (
  "id" text not null primary key,
  "discountId" text not null references "discounts" ("id") on delete cascade,
  "userId" text not null references "user" ("id") on delete cascade,
  "orderId" text not null,
  "usedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "discountUsage_discountId_idx" on "discountUsage" ("discountId");
create index "discountUsage_userId_idx" on "discountUsage" ("userId");
