# DTF Transfer Print Database Schema

Complete database schema for a DTF (Direct-to-Film) transfer printing e-commerce platform with support for customizable products, quantity-based pricing tiers, and reseller discounts.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Features](#features)
- [Usage Examples](#usage-examples)
- [API Routes](#api-routes)
- [Components](#components)
- [Running Migrations](#running-migrations)

## Overview

This schema extends your existing Better Auth e-commerce database with DTF-specific features:

- **Customizable product dimensions** (width/height in mm)
- **File upload support** for print designs (PDF files up to 255MB)
- **Quantity-based price tiers** with percentage discounts
- **Reseller discount system** that combines with quantity discounts
- **Multi-level category hierarchy** for navigation menus
- **Related products** support
- **Product specifications and reviews**

## Database Schema

### Core Tables

#### Extended Tables

**products** - Extended with DTF-specific fields:
- `maxWidthMm` - Maximum width in millimeters
- `minHeightMm` - Minimum height in millimeters
- `maxHeightMm` - Maximum height in millimeters
- `acceptsFileUpload` - Whether product accepts file uploads
- `maxFileSizeMb` - Maximum file size in megabytes (default: 255)
- `allowedFileTypes` - Comma-separated file types (e.g., "PDF")
- `priceCalculationMethod` - How to calculate price: `per_piece`, `per_area`, or `per_meter`
- `isBlockout` - Whether this is a blockout product (for dark textiles)
- `printTechnology` - Print technology used (e.g., "DTF")

**cartItems** - Extended with customization fields:
- `widthMm` - Custom width in millimeters
- `heightMm` - Custom height in millimeters
- `uploadedFileUrl` - URL to uploaded design file
- `uploadedFileName` - Original filename

**orderItems** - Extended with the same customization fields as cartItems

**user** - Extended with reseller fields:
- `isReseller` - Whether user is a reseller
- `resellerDiscountPercent` - Reseller discount percentage (0-100)

#### New Tables

**priceTiers** - Quantity-based pricing tiers
```sql
CREATE TABLE "priceTiers" (
  "id" text PRIMARY KEY,
  "productId" text NOT NULL,
  "minQuantity" integer NOT NULL,
  "maxQuantity" integer, -- NULL = infinity
  "discountPercent" decimal(5,2) NOT NULL,
  "pricePerUnit" decimal(10,2) NOT NULL,
  "displayOrder" integer DEFAULT 0
)
```

**relatedProducts** - Product relationships
```sql
CREATE TABLE "relatedProducts" (
  "id" text PRIMARY KEY,
  "productId" text NOT NULL,
  "relatedProductId" text NOT NULL,
  "displayOrder" integer DEFAULT 0
)
```

### Category Hierarchy

Categories support unlimited nesting via the `parentId` field:

```
DTF Transfer (cat-dtf-transfer)
├── Meterware (cat-meterware)
│   ├── Blockout (cat-blockout)
│   └── Standard (cat-standard)
└── Standardformate (cat-standardformate)
    ├── A4 Format (cat-a4-format)
    └── A3 Format (cat-a3-format)
```

## Features

### 1. Price Tier System

Products can have multiple price tiers based on quantity:

| Quantity | Discount | Price per Unit |
|----------|----------|----------------|
| 0 - 4    | 0%       | 14.99€         |
| 5 - 9    | 2%       | 14.69€         |
| 10 - 24  | 5%       | 14.24€         |
| 25 - 49  | 7%       | 13.94€         |
| 50 - 149 | 11%      | 13.34€         |
| 150+     | 13%      | 13.04€         |

**Key Features:**
- Tiers are automatically applied based on quantity
- Discounts can be combined with reseller discounts
- Frontend dynamically highlights current tier
- Shows "unlocked" status for reached tiers

### 2. Reseller Discount System

Resellers get additional discounts on top of quantity tiers:

```typescript
// Example: 5% reseller discount + 11% quantity discount
const tierPrice = 13.34; // Base price for 50-149 units
const resellerDiscount = tierPrice * 0.05; // Additional 5%
const finalPrice = tierPrice - resellerDiscount;
```

### 3. Custom Product Configuration

Products can be customized with:
- **Dimensions**: Custom width and height in millimeters
- **File Upload**: PDF designs up to 255MB
- **Validation**: Min/max constraints on dimensions

### 4. Price Calculation Methods

Three calculation methods supported:

1. **per_piece**: Fixed price per item (standard products)
2. **per_meter**: Price calculated by linear meters (height in mm / 1000)
3. **per_area**: Price calculated by square meters (width × height in m²)

## Usage Examples

### Fetching a Product with Price Tiers

```typescript
import { db } from '@/lib/db';

const product = await db
  .selectFrom('products')
  .selectAll()
  .where('slug', '=', 'dtf-laufmeter-blockout-meterware')
  .executeTakeFirst();

const priceTiers = await db
  .selectFrom('priceTiers')
  .selectAll()
  .where('productId', '=', product.id)
  .orderBy('displayOrder', 'asc')
  .execute();
```

### Calculating Price

```typescript
import { calculatePrice } from '@/lib/utils/pricing';

const calculation = calculatePrice(
  product,
  quantity: 25,
  priceTiers,
  resellerDiscountPercent: 5
);

console.log(calculation);
// {
//   unitPrice: 13.94,
//   quantity: 25,
//   discountPercent: 7,
//   resellerDiscountPercent: 5,
//   subtotal: 348.50,
//   tierDiscount: 26.25,
//   resellerDiscount: 17.43,
//   totalDiscount: 43.68,
//   total: 331.07
// }
```

### Adding to Cart with Custom Configuration

```typescript
const response = await fetch('/api/cart/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'prod-dtf-blockout-5m',
    quantity: 10,
    widthMm: 560,
    heightMm: 4500,
    uploadedFileUrl: 'https://cdn.example.com/designs/abc123.pdf',
    uploadedFileName: 'my-design.pdf'
  })
});
```

## API Routes

### Products

**GET /api/products/[slug]**
- Fetches product with all related data
- Includes: images, price tiers, specifications, related products
- Returns product reviews and average rating

### Cart

**POST /api/cart/add**
- Adds product to cart with custom configuration
- Validates dimensions against product constraints
- Checks inventory if tracking is enabled
- Calculates unit price based on quantity tier

## Components

### PriceTierTable

Displays quantity-based pricing tiers with dynamic highlighting:

```tsx
<PriceTierTable
  product={product}
  priceTiers={priceTiers}
  currentQuantity={10}
  currency="EUR"
  locale="de-DE"
/>
```

**Features:**
- Highlights current tier for selected quantity
- Shows "unlocked" status for available tiers
- Displays savings percentage
- Responsive design

### ProductConfigurator

Complete product configuration interface:

```tsx
<ProductConfigurator
  product={product}
  priceTiers={priceTiers}
  isReseller={true}
  resellerDiscountPercent={5}
  currency="EUR"
  locale="de-DE"
/>
```

**Features:**
- File upload with validation
- Dimension input with constraints
- Quantity selector
- Real-time price calculation
- Error validation
- Add to cart functionality

## Running Migrations

### 1. Apply the DTF Features Migration

```bash
# Run the migration to add DTF-specific fields
psql -d your_database -f better-auth_migrations/2026-01-11T12-00-00.000Z_add_dtf_product_features.sql
```

### 2. Seed Sample Data

```bash
# Add the sample DTF Blockout product
psql -d your_database -f better-auth_migrations/2026-01-11T12-01-00.000Z_seed_dtf_blockout_product.sql
```

### 3. Verify Data

```sql
-- Check categories
SELECT * FROM categories WHERE slug LIKE '%dtf%' OR slug LIKE '%blockout%';

-- Check product
SELECT * FROM products WHERE slug = 'dtf-laufmeter-blockout-meterware';

-- Check price tiers
SELECT * FROM "priceTiers" WHERE "productId" = 'prod-dtf-blockout-5m';
```

## Database Functions

### get_price_for_quantity()

Returns the applicable price tier for a given quantity:

```sql
SELECT * FROM get_price_for_quantity('prod-dtf-blockout-5m', 25);
-- Returns: unitPrice, discountPercent, tierId
```

### calculate_line_total()

Calculates total price including reseller discount:

```sql
SELECT calculate_line_total(
  'prod-dtf-blockout-5m',  -- productId
  25,                       -- quantity
  'user-123'               -- userId (optional, for reseller discount)
);
-- Returns: 331.07
```

## Frontend Integration

### 1. Product Page

```astro
---
import ProductConfigurator from '@/components/ProductConfigurator';

const { slug } = Astro.params;
const response = await fetch(`${Astro.url.origin}/api/products/${slug}`);
const { data: product } = await response.json();
---

<div class="product-page">
  <h1>{product.name}</h1>
  <div set:html={product.description} />

  <ProductConfigurator
    product={product}
    priceTiers={product.priceTiers}
    client:load
  />
</div>
```

### 2. Category Navigation

```typescript
// Build category tree for navigation
const categories = await db
  .selectFrom('categories')
  .selectAll()
  .where('isActive', '=', true)
  .orderBy('displayOrder', 'asc')
  .execute();

const categoryTree = buildTree(categories);
```

### 3. Cart Summary

```typescript
const cartItems = await db
  .selectFrom('cartItems')
  .innerJoin('products', 'products.id', 'cartItems.productId')
  .selectAll('cartItems')
  .select(['products.name', 'products.slug'])
  .where('userId', '=', userId)
  .execute();

const total = cartItems.reduce((sum, item) => {
  return sum + (item.unitPrice * item.quantity);
}, 0);
```

## Admin Backend

### Adding Products

Required fields for DTF products:
- Basic info: name, slug, description, category
- Pricing: basePrice
- DTF fields: maxWidthMm, minHeightMm, maxHeightMm
- Upload settings: acceptsFileUpload, maxFileSizeMb, allowedFileTypes
- Price tiers: Array of tier objects

### Managing Price Tiers

```typescript
// Add price tier
await db
  .insertInto('priceTiers')
  .values({
    id: nanoid(),
    productId: 'prod-dtf-blockout-5m',
    minQuantity: 50,
    maxQuantity: 149,
    discountPercent: 11,
    pricePerUnit: 13.34,
    displayOrder: 5
  })
  .execute();
```

## Best Practices

1. **Always validate dimensions** on both frontend and backend
2. **Cache product data** with price tiers for better performance
3. **Use database functions** for price calculations to ensure consistency
4. **Index frequently queried fields** (slug, categoryId, userId)
5. **Implement proper file upload security** (virus scanning, file type validation)
6. **Monitor storage costs** for uploaded files (use CDN with proper cleanup)
7. **Test tier boundaries** (e.g., quantity 4 vs 5, 149 vs 150)

## Troubleshooting

### Price tiers not applying
- Check `displayOrder` in priceTiers table
- Verify `minQuantity` and `maxQuantity` ranges don't overlap incorrectly
- Ensure product has `basePrice` as fallback

### File upload failing
- Check `maxFileSizeMb` setting
- Verify `allowedFileTypes` matches uploaded file
- Ensure upload endpoint has proper permissions

### Reseller discount not working
- Verify user has `isReseller = true`
- Check `resellerDiscountPercent` is set correctly (0-100)
- Ensure calculation function is called with userId

## License

This schema is part of the DTF Transfer Print project.
