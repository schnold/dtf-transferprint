-- Create productFiles table for customer-uploaded design files
create table if not exists "productFiles" (
  "id" text not null primary key,
  "productId" text not null references "products" ("id") on delete cascade,
  "fileName" text not null,
  "originalFileName" text not null,
  "fileUrl" text not null,
  "fileSize" bigint not null,
  "mimeType" text not null,
  "uploadedBy" text references "user" ("id") on delete set null,
  "isPublic" boolean not null default false,
  "displayOrder" integer not null default 0,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index if not exists "productFiles_productId_idx" on "productFiles" ("productId");
create index if not exists "productFiles_uploadedBy_idx" on "productFiles" ("uploadedBy");
create index if not exists "productFiles_createdAt_idx" on "productFiles" ("createdAt" desc);
