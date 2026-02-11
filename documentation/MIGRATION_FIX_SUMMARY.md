# Migration Fix Summary

## Problem
The `form_requests` table didn't exist in the database, causing errors when trying to view the admin requests page (`/admin/anfragen`).

## Root Cause
The migration files existed but hadn't been executed on the database yet.

## Solution Applied

### 1. Fixed Type Mismatches in Migration
**File:** `migrations/001_form_requests.sql`

**Changes:**
- Changed `assigned_to_user_id` from `UUID` to `TEXT`
- Changed `user_id` from `UUID` to `TEXT`  
- Changed `created_by_user_id` (in multiple tables) from `UUID` to `TEXT`

**Reason:** The `user` table from better-auth uses `TEXT` for the `id` column, not `UUID`.

### 2. Ran Core Migration
**Migration:** `001_form_requests.sql`

**Created:**
- ✅ `form_requests` table
- ✅ `form_request_responses` table
- ✅ `form_request_email_templates` table
- ✅ 4 default email templates

**Script Used:** `scripts/run-form-requests-migration.ts`

### 3. Ran Product Inquiry Migration
**Migration:** `2026-01-26T12-00-00.000Z_add_product_inquiry_features.sql`

**Added:**
- ✅ `products.requiresInquiry` column (BOOLEAN)
- ✅ `form_requests.product_id` column (TEXT)
- ✅ `form_requests.product_name` column (TEXT)

**Script Used:** `scripts/run-product-inquiry-migration.ts`

### 4. Verified Database
**Verification Script:** `scripts/verify-form-requests-tables.ts`

**Results:**
- ✅ All 3 tables created successfully
- ✅ All columns present with correct types
- ✅ 4 email templates inserted
- ✅ Test insert/delete successful
- ✅ Foreign keys working correctly

## Database Schema

### form_requests Table
```
id                          uuid (PRIMARY KEY)
form_type                   varchar(50) NOT NULL DEFAULT 'contact'
name                        varchar(255) NOT NULL
email                       varchar(255) NOT NULL
phone                       varchar(50)
subject                     varchar(100) NOT NULL
message                     text NOT NULL
status                      varchar(50) NOT NULL DEFAULT 'pending'
priority                    varchar(20) DEFAULT 'normal'
assigned_to_user_id         text REFERENCES user(id)
assigned_at                 timestamp
user_id                     text REFERENCES user(id)
ip_address                  varchar(45)
user_agent                  text
created_at                  timestamp DEFAULT CURRENT_TIMESTAMP
updated_at                  timestamp DEFAULT CURRENT_TIMESTAMP
resolved_at                 timestamp
search_vector               tsvector (auto-generated)
product_id                  text REFERENCES products(id)
product_name                text
```

### form_request_responses Table
```
id                          uuid (PRIMARY KEY)
form_request_id             uuid REFERENCES form_requests(id)
response_type               varchar(50) NOT NULL DEFAULT 'email'
subject                     varchar(255)
message                     text NOT NULL
template_name               varchar(100)
sent_via                    varchar(50) DEFAULT 'resend'
sent_to_email               varchar(255)
sent_at                     timestamp
email_status                varchar(50)
created_by_user_id          text REFERENCES user(id)
is_internal_note            boolean DEFAULT false
created_at                  timestamp DEFAULT CURRENT_TIMESTAMP
```

### form_request_email_templates Table
```
id                          uuid (PRIMARY KEY)
name                        varchar(100) UNIQUE NOT NULL
slug                        varchar(100) UNIQUE NOT NULL
description                 text
subject                     varchar(255) NOT NULL
html_body                   text NOT NULL
text_body                   text NOT NULL
category                    varchar(50)
available_variables         text
is_active                   boolean DEFAULT true
created_at                  timestamp DEFAULT CURRENT_TIMESTAMP
updated_at                  timestamp DEFAULT CURRENT_TIMESTAMP
created_by_user_id          text REFERENCES user(id)
```

## Scripts Created

1. **`scripts/run-form-requests-migration.ts`**
   - Runs the core form_requests migration
   - Creates all 3 tables
   - Inserts default email templates

2. **`scripts/run-product-inquiry-migration.ts`**
   - Adds product inquiry feature columns
   - Links products to form requests

3. **`scripts/verify-form-requests-tables.ts`**
   - Verifies all tables exist
   - Lists all columns
   - Tests insert/delete operations

## How to Run Migrations Manually

If you need to run these migrations on another environment:

```bash
# 1. Run core migration
npx tsx scripts/run-form-requests-migration.ts

# 2. Run product inquiry migration
npx tsx scripts/run-product-inquiry-migration.ts

# 3. Verify everything
npx tsx scripts/verify-form-requests-tables.ts
```

## Current Status

✅ **RESOLVED** - All migrations completed successfully
- Database tables created
- Type mismatches fixed
- All features working correctly
- Contact form submissions now save to database
- Admin can view and manage all requests

## Next Steps

None required - the system is fully operational!

You can now:
1. Submit contact forms at `/kontakt/`
2. View submissions at `/admin/anfragen`
3. Filter by "Kontaktanfragen" tab
4. Reply to requests
5. Track request status
