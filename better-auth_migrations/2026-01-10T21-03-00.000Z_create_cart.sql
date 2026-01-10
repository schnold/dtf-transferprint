create table "cartItems" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "productId" text not null references "products" ("id") on delete cascade,
  "quantity" integer not null default 1 check ("quantity" > 0),
  "unitPrice" decimal(10, 2) not null,
  "customOptions" jsonb,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "cartItems_userId_idx" on "cartItems" ("userId");
create index "cartItems_productId_idx" on "cartItems" ("productId");
create unique index "cartItems_unique_idx" on "cartItems" ("userId", "productId");
