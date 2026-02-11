# Admin Product Management - Complete Setup Guide

## Summary

Your DTF transfer print e-commerce database is now fully set up with:
- ✅ Product management with DTF-specific fields (dimensions, file upload)
- ✅ Quantity-based price tiers (like competitor: 0-4, 5-9, 10-24, etc.)
- ✅ Reseller discount system
- ✅ Multi-level category hierarchy for navbar menus
- ✅ Admin UI for creating/managing products ⭐ NEW
- ✅ Admin UI for creating/managing categories (navbar structure) ⭐ NEW
- ✅ Integrated admin navigation with tabs (Dashboard, Users, Products, Categories)
- ✅ Frontend product display with price tier tables
- ✅ Sample DTF Blockout product with 6 price tiers

## Quick Start

1. **Access Admin Panel**: `/admin` (Dashboard with navigation tabs)
2. **Manage Products**: `/admin/products` - Create and edit products
3. **Manage Categories**: `/admin/categories` - Create navbar menu structure
4. **View Product**: `/products/dtf-laufmeter-blockout-meterware` (sample product)

## Admin Interface Features

### Admin Navigation Tabs
The admin panel includes these sections:
- **Dashboard** - Overview with user statistics
- **Benutzer** - User management
- **Produkte** - Product management ⭐ NEW
- **Kategorien** - Category management for navbar ⭐ NEW
- **Einstellungen** - System settings

### Product List (`/admin/products`)
- View all products in table format
- See product stats (total, active, inactive, featured)
- Product type badges (Blockout, Upload, per_meter)
- Number of price tiers
- Quick edit and view links

### Product Create Form (`/admin/products/create`)
- **Basic Info**: Name, slug, category, SKU, descriptions
- **Pricing**: Base price, compare at price, calculation method
- **DTF Settings**:
  - Blockout toggle
  - File upload (max size, allowed types)
  - Dimensions (560mm × 100-5000mm)
  - Print technology
- **Price Tiers**: Dynamic add/remove tiers with quantity ranges
- **Status**: Active, Featured, Track Inventory
- **SEO**: Meta title and description

### Category Management (`/admin/categories`) ⭐ NEW
- **View Categories**: Hierarchical table showing all categories
  - Shows category level (0 = main, 1+ = subcategories)
  - Full path display (e.g., "DTF Transfer > Meterware > Blockout")
  - Product count per category
  - Display order for navbar positioning
  - Active/inactive status
- **Stats Dashboard**:
  - Total categories
  - Active vs inactive
  - Main categories count
- **Create Category** (`/admin/categories/create`):
  - Category name (auto-generates slug)
  - URL-friendly slug
  - Description (optional)
  - Parent category selection (for multi-level menus)
  - Display order (controls navbar position)
  - Category image URL (optional)
  - Active/inactive toggle
- **Features**:
  - Multi-level hierarchy support (unlimited nesting)
  - Auto-slug generation from name
  - Protection: Cannot delete categories with products or subcategories
  - Navbar menu structure visualization

## Database Structure

### Extended Tables

**products** - Now includes:
```
maxWidthMm          integer
minHeightMm         integer
maxHeightMm         integer
acceptsFileUpload   boolean
maxFileSizeMb       integer (default: 255)
allowedFileTypes    text (default: 'PDF')
priceCalculationMethod  text ('per_piece', 'per_area', 'per_meter')
isBlockout          boolean
printTechnology     text
```

**priceTiers** - New table:
```
id                  text PRIMARY KEY
productId           text REFERENCES products(id)
minQuantity         integer NOT NULL
maxQuantity         integer (NULL = infinity)
discountPercent     decimal(5,2)
pricePerUnit        decimal(10,2)
displayOrder        integer
```

**user** - Extended:
```
isReseller                boolean
resellerDiscountPercent   decimal(5,2)
```

## Sample Data

### DTF Blockout Product
- **Name**: DTF Laufmeter Blockout Meterware
- **Price**: 14.99€ base
- **Dimensions**: 560mm × 100-5000mm
- **Features**: Blockout, File Upload (PDF, 255MB max)

### Price Tiers
| Quantity | Discount | Price |
|----------|----------|-------|
| 0-4      | 0%       | 14.99€|
| 5-9      | 2%       | 14.69€|
| 10-24    | 5%       | 14.24€|
| 25-49    | 7%       | 13.94€|
| 50-149   | 11%      | 13.34€|
| 150+     | 13%      | 13.04€|

## How to Create a Product

1. Navigate to `/admin/products` and click "Create Product"
2. Fill in basic information
3. Set pricing and calculation method
4. Configure DTF settings if applicable
5. Add price tiers (click "+ Add Tier")
6. Set status (Active, Featured)
7. Add SEO metadata
8. Click "Create Product"

## How to Create Categories for Navbar Menu

### Creating a Main Category
1. Navigate to `/admin/categories` and click "Kategorie erstellen"
2. Enter category name (e.g., "DTF Transfer")
3. Slug is auto-generated (e.g., "dtf-transfer")
4. Leave "Übergeordnete Kategorie" as "Keine (Hauptkategorie)"
5. Set display order (lower numbers appear first, e.g., 0, 1, 2)
6. Optionally add description and image URL
7. Ensure "Kategorie aktivieren" is checked
8. Click "Kategorie erstellen"

### Creating a Subcategory (Dropdown Menu)
1. Navigate to `/admin/categories` and click "Kategorie erstellen"
2. Enter category name (e.g., "Meterware")
3. Select the parent category from "Übergeordnete Kategorie" dropdown
4. Set display order relative to sibling categories
5. Click "Kategorie erstellen"

### Example Navbar Structure
```
Main Menu:
├── DTF Transfer (displayOrder: 0)
│   ├── Meterware (displayOrder: 0)
│   │   ├── Blockout (displayOrder: 0)
│   │   └── Standard (displayOrder: 1)
│   └── Standardformate (displayOrder: 1)
│       ├── A4 Format (displayOrder: 0)
│       └── A3 Format (displayOrder: 1)
└── Beratung (displayOrder: 1)
```

This creates a multi-level dropdown menu in your navbar!

## API Endpoints

### Products
- `POST /api/admin/products/create` - Create new product
- `GET /api/products/[slug]` - Get product details with price tiers
- `POST /api/cart/add` - Add to cart with custom config

### Categories ⭐ NEW
- `POST /api/admin/categories/create` - Create new category
- `PUT /api/admin/categories/[id]` - Update category
- `DELETE /api/admin/categories/[id]` - Delete category (with protection)

## Utility Functions

Available in `src/lib/utils/pricing.ts`:
- `calculatePrice()` - Calculate price with tiers + reseller discount
- `getApplicablePriceTier()` - Find tier for quantity
- `formatPriceTiersForDisplay()` - Format tiers for UI table
- `isValidProductConfiguration()` - Validate dimensions

## Next Steps

- [ ] Add product edit page
- [ ] Implement image upload (S3/Cloudflare R2)
- [ ] Add related products management
- [ ] Add specifications management UI
- [ ] Implement search and filters
- [ ] Add bulk operations

## Files Created

**Migrations:**
- `better-auth_migrations/2026-01-11T12-00-00.000Z_add_dtf_product_features.sql`
- `better-auth_migrations/2026-01-11T12-01-00.000Z_seed_dtf_blockout_product.sql`

**Admin Pages:**
- `src/pages/admin/products/index.astro`
- `src/pages/admin/products/create.astro`
- `src/pages/admin/categories/index.astro` ⭐ NEW
- `src/pages/admin/categories/create.astro` ⭐ NEW
- `src/layouts/AdminLayout.astro` (updated with Products & Categories tabs)

**API Routes:**
- `src/pages/api/admin/products/create.ts`
- `src/pages/api/admin/categories/create.ts` ⭐ NEW
- `src/pages/api/admin/categories/[id].ts` ⭐ NEW (DELETE, PUT)
- `src/pages/api/products/[slug].ts`
- `src/pages/api/cart/add.ts`

**Components:**
- `src/components/PriceTierTable.tsx`
- `src/components/ProductConfigurator.tsx`

**Frontend:**
- `src/pages/products/[slug].astro`

**Utilities:**
- `src/lib/utils/pricing.ts`
- `src/types/database.ts`

**Docs:**
- `DATABASE_README.md`
- `ADMIN_SETUP.md`
