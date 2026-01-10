create table "categories" (
  "id" text not null primary key,
  "name" text not null,
  "slug" text not null unique,
  "description" text,
  "parentId" text references "categories" ("id") on delete set null,
  "displayOrder" integer not null default 0,
  "isActive" boolean not null default true,
  "imageUrl" text,
  "createdAt" timestamptz not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamptz not null default CURRENT_TIMESTAMP
);

create index "categories_slug_idx" on "categories" ("slug");
create index "categories_parentId_idx" on "categories" ("parentId");
create index "categories_isActive_idx" on "categories" ("isActive");
