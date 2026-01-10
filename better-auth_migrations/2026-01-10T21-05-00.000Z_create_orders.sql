create table "orders" (
  "id" text not null primary key,
  "orderNumber" text not null unique,
  "userId" text not null references "user" ("id") on delete restrict,
  "status" text not null default 'pending' check ("status" in ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  "paymentStatus" text not null default 'pending' check ("paymentStatus" in ('pending', 'paid', 'failed', 'refunded')),
  "fulfillmentStatus" text not null default 'unfulfilled' check ("fulfillmentStatus" in ('unfulfilled', 'partial', 'fulfilled')),
  "currency" text not null default 'EUR',
  "subtotal" decimal(10, 2) not null check ("subtotal" >= 0),
  "discountAmount" decimal(10, 2) not null default 0 check ("discountAmount" >= 0),
  "shippingCost" decimal(10, 2) not null default 0 check ("shippingCost" >= 0),
  "taxAmount" decimal(10, 2) not null default 0 check ("taxAmount" >= 0),
  "total" decimal(10, 2) not null check ("total" >= 0),
  "discountCode" text,
  "discountId" text references "discounts" ("id") on delete set null,
  "shippingMethod" text,
  "trackingNumber" text,
  "trackingUrl" text,
  "shippingAddressId" text references "userAddresses" ("id") on delete set null,
  "billingAddressId" text references "userAddresses" ("id") on delete set null,
  "customerNote" text,
  "adminNote" text,
  "ipAddress" text,
  "userAgent" text,
  "cancelledAt" timestamptz,
  "cancelledReason" text,
  "refundedAt" timestamptz,
  "refundedAmount" decimal(10, 2),
  "refundedReason" text,
  "shippedAt" timestamptz,
  "deliveredAt" timestamptz,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "orders_orderNumber_idx" on "orders" ("orderNumber");
create index "orders_userId_idx" on "orders" ("userId");
create index "orders_status_idx" on "orders" ("status");
create index "orders_paymentStatus_idx" on "orders" ("paymentStatus");
create index "orders_createdAt_idx" on "orders" ("createdAt" desc);
create index "orders_discountId_idx" on "orders" ("discountId");

create table "orderItems" (
  "id" text not null primary key,
  "orderId" text not null references "orders" ("id") on delete cascade,
  "productId" text not null references "products" ("id") on delete restrict,
  "productName" text not null,
  "sku" text,
  "quantity" integer not null check ("quantity" > 0),
  "unitPrice" decimal(10, 2) not null check ("unitPrice" >= 0),
  "totalPrice" decimal(10, 2) not null check ("totalPrice" >= 0),
  "customOptions" jsonb,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "orderItems_orderId_idx" on "orderItems" ("orderId");
create index "orderItems_productId_idx" on "orderItems" ("productId");

create table "orderStatusHistory" (
  "id" text not null primary key,
  "orderId" text not null references "orders" ("id") on delete cascade,
  "status" text not null,
  "note" text,
  "notifiedCustomer" boolean not null default false,
  "createdByUserId" text references "user" ("id") on delete set null,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "orderStatusHistory_orderId_idx" on "orderStatusHistory" ("orderId");
create index "orderStatusHistory_createdAt_idx" on "orderStatusHistory" ("createdAt" desc);
