# Product Inquiry Feature

This document describes the new product inquiry feature that allows products to require customer inquiries instead of direct cart/checkout.

## Overview

The product inquiry feature enables you to set products as "inquiry only" - meaning customers cannot add them to the cart or checkout directly. Instead, they fill out an inquiry form on the product page, which is submitted to the admin backend for follow-up.

## What Was Implemented

### 1. Database Schema Changes
**File:** `better-auth_migrations/2026-01-26T12-00-00.000Z_add_product_inquiry_features.sql`

- Added `requiresInquiry` boolean field to `products` table (default: false)
- Added `product_id` and `product_name` fields to `form_requests` table for linking inquiries to products
- Created appropriate indexes for performance

### 2. TypeScript Type Updates
**Files:**
- `src/types/database.ts` - Added `requiresInquiry` to Product and ProductFormData interfaces
- `src/lib/db.ts` - Added `productId` and `productName` to FormRequest interface and createFormRequest function

### 3. API Endpoint
**File:** `src/pages/api/product-inquiry.ts`

New API endpoint that:
- Accepts product information and customer inquiry details
- Sends email to company with product info and customer message
- Sends confirmation email to customer
- Stores inquiry in database with form_type = 'produktanfrage'

### 4. Product Inquiry Form Component
**File:** `src/components/product/ProductInquiryForm.astro`

A form component that displays:
- Info banner explaining inquiry requirement
- Form fields: name, email, phone (optional), message
- Success/error message handling
- Trust badges for reassurance

### 5. Product Page Updates
**File:** `src/pages/product/[slug].astro`

Modified to:
- Import ProductInquiryForm component
- Conditionally render ProductInquiryForm OR ProductActions based on `product.requiresInquiry`
- When `requiresInquiry` is true, cart/checkout is hidden and inquiry form is shown

### 6. Admin Backend Updates
**File:** `src/pages/admin/anfragen.astro`

Enhanced to:
- Display product information for product inquiries
- Show product badge icon in the inquiry list
- Add "Produktanfragen" filter tab
- Display product name and link in inquiry details modal
- Filter inquiries by form type (product inquiries vs. regular contact)

## How to Use

### Setting a Product as Inquiry-Only

#### Option 1: Via Database (Recommended)
Run this SQL query to enable inquiry mode for a specific product:

```sql
UPDATE products
SET "requiresInquiry" = true
WHERE slug = 'your-product-slug';
```

#### Option 2: Via Admin Panel (Future Enhancement)
In a future update, you can add a checkbox in the product admin form to toggle this setting.

### Customer Experience

1. Customer visits a product page where `requiresInquiry` is enabled
2. Instead of "Add to Cart" and checkout buttons, they see an inquiry form
3. They fill in their details (name, email, optional phone, message)
4. Upon submission:
   - They receive a confirmation email
   - Company receives an email with their inquiry and product details
   - Inquiry is stored in the database

### Admin Experience

1. Navigate to **Admin Panel → Anfragen**
2. Product inquiries are marked with a 🛒 product icon badge
3. Use the "Produktanfragen" filter tab to see only product inquiries
4. Click "Ansehen" to view inquiry details, which includes:
   - Product name and link
   - Customer information
   - Their message
   - Response history
5. Reply to customers using email templates or custom responses

## Database Migration

To apply the database changes, run the migration file:

```bash
# If using a migration tool
npm run migrate

# Or manually apply the SQL
psql $DATABASE_URL -f better-auth_migrations/2026-01-26T12-00-00.000Z_add_product_inquiry_features.sql
```

## Email Templates

The system sends two emails per inquiry:

### 1. Company Notification Email
- Subject: `Produktanfrage: [Product Name] - [Customer Name]`
- Includes product information with link
- Customer details and message
- Reply-to set to customer's email

### 2. Customer Confirmation Email
- Subject: `Ihre Produktanfrage: [Product Name]`
- Thanks customer for their interest
- Shows product name and their message
- Reassures them they'll receive a response soon

## API Endpoints

### POST `/api/product-inquiry`
Submit a new product inquiry.

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (optional)",
  "message": "string (required, min 10 chars)",
  "productId": "string (required)",
  "productName": "string (required)",
  "productSlug": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ihre Produktanfrage wurde erfolgreich gesendet."
}
```

## Form Types

Product inquiries use `form_type = 'produktanfrage'` to differentiate them from regular contact forms in the database.

## Example Use Cases

1. **Custom/Made-to-Order Products**
   - Products that require specifications before pricing
   - Items that need customer consultation

2. **B2B Products**
   - Bulk orders requiring quotes
   - Products with tiered pricing based on volume

3. **Special Request Items**
   - Limited availability products
   - Products requiring approval before purchase

4. **Premium Services**
   - Consulting services
   - Custom design work

## Future Enhancements

Potential improvements to consider:

1. ✅ Admin panel checkbox to toggle `requiresInquiry` without SQL
2. ✅ Inquiry-to-Order conversion (convert approved inquiries to orders)
3. ✅ Custom email templates specifically for product inquiries
4. ✅ Inquiry analytics (conversion rates, response times)
5. ✅ Customer portal to track their inquiry status
6. ✅ Automated follow-up reminders for unanswered inquiries

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Set a test product's `requiresInquiry` to true
- [ ] Visit product page and verify inquiry form shows (not cart buttons)
- [ ] Submit an inquiry and verify:
  - [ ] Success message displays
  - [ ] Customer receives confirmation email
  - [ ] Company receives notification email
  - [ ] Inquiry appears in admin panel with product badge
  - [ ] Product info shows in inquiry details modal
- [ ] Filter by "Produktanfragen" and verify it shows only product inquiries
- [ ] Reply to a product inquiry from admin panel
- [ ] Set product back to normal mode and verify cart/checkout appears

## Support

If you encounter any issues:
1. Check browser console for JavaScript errors
2. Verify migration was applied correctly
3. Check email logs in Resend dashboard
4. Review server logs for API errors

## Credits

Feature implemented on 2026-01-26
