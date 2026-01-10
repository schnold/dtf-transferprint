create table "userAddresses" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "addressType" text not null check ("addressType" in ('shipping', 'billing', 'both')),
  "isDefault" boolean not null default false,
  "firstName" text not null,
  "lastName" text not null,
  "company" text,
  "addressLine1" text not null,
  "addressLine2" text,
  "city" text not null,
  "stateProvince" text,
  "postalCode" text not null,
  "country" text not null default 'DE',
  "phone" text,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "userAddresses_userId_idx" on "userAddresses" ("userId");
create index "userAddresses_isDefault_idx" on "userAddresses" ("userId", "isDefault");
