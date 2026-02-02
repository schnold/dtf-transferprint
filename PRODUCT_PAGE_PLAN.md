# Product Page Implementation Plan
## Using DaisyUI and Astro

### Overview
This plan outlines the steps to create a comprehensive product page for DTF Transfer Print services using Astro framework and DaisyUI component library.

---

## 1. Project Structure Setup

### 1.1 Create Product Page Route
- **File**: `src/pages/product/[slug].astro` or `src/pages/product/[id].astro`
- **Purpose**: Dynamic route for individual products
- **Features**:
  - Support for multiple products via dynamic routing
  - SEO-friendly URLs with product slugs

### 1.2 Create Product Data Structure
- **File**: `src/data/products.ts` or `src/data/products.json`
- **Purpose**: Store product information
- **Data Fields**:
  ```typescript
  {
    id: string
    slug: string
    name: string
    description: string
    shortDescription: string
    price: number
    images: string[]
    category: string
    specifications: object
    variants?: array
    inStock: boolean
    tags: string[]
  }
  ```

### 1.3 Create Product Components Directory
- **Directory**: `src/components/product/`
- **Components to create**:
  - `ProductGallery.astro` - Image gallery with thumbnails
  - `ProductInfo.astro` - Product title, description, price
  - `ProductSpecs.astro` - Technical specifications
  - `ProductVariants.astro` - Size, color, quantity selectors
  - `ProductActions.astro` - Add to cart, order buttons
  - `ProductReviews.astro` - Customer reviews section
  - `RelatedProducts.astro` - Similar products carousel

---

## 2. Product Page Layout

### 2.1 Main Product Page Structure
- **Layout**: Two-column grid (responsive)
  - **Left Column**: Product image gallery
  - **Right Column**: Product information and actions
- **Below**: Product details, specifications, reviews

### 2.2 DaisyUI Components to Use
- `card` - Product information container
- `carousel` - Image gallery
- `badge` - Stock status, tags, categories
- `btn` - Action buttons (Order, Add to Cart, etc.)
- `select` / `input` - Quantity, variant selectors
- `tabs` - Product details, specs, reviews
- `rating` - Product ratings display
- `divider` - Section separators
- `alert` - Stock warnings, special offers
- `collapse` - Expandable sections (FAQ, specs)

---

## 3. Component Implementation Details

### 3.1 ProductGallery.astro
**Features**:
- Main product image display
- Thumbnail navigation
- Image zoom functionality (optional)
- Responsive image loading
- DaisyUI `carousel` component

**DaisyUI Classes**:
- `carousel` for main image
- `carousel-item` for each image
- Custom thumbnail grid below

### 3.2 ProductInfo.astro
**Features**:
- Product title (h1)
- Short description
- Price display with currency formatting
- Stock status badge
- Category/tag badges
- DaisyUI `badge` components

**DaisyUI Classes**:
- `badge badge-primary` for stock status
- `badge badge-ghost` for tags
- `text-*` for typography

### 3.3 ProductVariants.astro
**Features**:
- Size selector (if applicable)
- Color selector (if applicable)
- Quantity input
- Variant price updates

**DaisyUI Components**:
- `select select-bordered` for dropdowns
- `input input-bordered` for quantity
- `label` for form labels

### 3.4 ProductActions.astro
**Features**:
- "Angebot anfordern" (Request Quote) button
- "In den Warenkorb" (Add to Cart) button (if e-commerce)
- "Jetzt bestellen" (Order Now) button
- Contact form trigger

**DaisyUI Components**:
- `btn btn-primary` for primary action
- `btn btn-secondary` for secondary action
- `btn btn-outline` for alternative actions

### 3.5 ProductSpecs.astro
**Features**:
- Technical specifications table
- Material information
- Size options
- Care instructions
- Print specifications

**DaisyUI Components**:
- `table` for specifications
- `collapse` for expandable details
- `divider` for section separation

### 3.6 ProductReviews.astro
**Features**:
- Customer reviews list
- Rating display
- Review form (optional)
- Review filtering/sorting

**DaisyUI Components**:
- `rating` for star display
- `card` for each review
- `avatar` for reviewer images
- `badge` for verified purchases

### 3.7 RelatedProducts.astro
**Features**:
- Grid of similar products
- Product cards with images
- Quick view functionality
- Link to product pages

**DaisyUI Components**:
- `card` for product cards
- `carousel` for horizontal scrolling (optional)
- `btn btn-ghost` for quick actions

---

## 4. Styling & Design

### 4.1 Color Scheme
- Use existing DaisyUI theme colors from `tailwind.config.mjs`
- Primary color for CTAs
- Neutral colors for text and backgrounds
- Success/Error badges for stock status

### 4.2 Responsive Design
- Mobile-first approach
- Stack columns on mobile
- Full-width gallery on mobile
- Side-by-side layout on desktop (lg breakpoint)

### 4.3 Typography
- Use existing font families (DM Sans, Inter)
- Consistent heading hierarchy
- Readable body text sizes

### 4.4 Spacing & Layout
- Use DaisyUI spacing utilities
- Consistent padding/margins
- Max-width container for content

---

## 5. Functionality & Interactivity

### 5.1 Client-Side Features (if needed)
- Image gallery navigation
- Variant selection updates
- Quantity calculations
- Form validation
- Add to cart functionality (if e-commerce)

### 5.2 Astro Islands (if needed)
- Use Astro Islands for interactive components
- React/Vue/Svelte components for complex interactions
- Keep most components static for performance

### 5.3 Form Handling
- Contact form for quote requests
- Form validation
- Success/error messages
- DaisyUI `alert` components for feedback

---

## 6. SEO & Performance

### 6.1 SEO Optimization
- Dynamic meta tags per product
- Open Graph tags for social sharing
- Structured data (JSON-LD) for products
- Semantic HTML structure

### 6.2 Performance
- Optimize images (WebP, lazy loading)
- Static generation for product pages
- Minimal JavaScript
- Astro's built-in optimizations

### 6.3 Accessibility
- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance

---

## 7. Implementation Steps

### Phase 1: Foundation
1. ✅ Create product data structure
2. ✅ Set up dynamic route (`[slug].astro`)
3. ✅ Create basic layout structure
4. ✅ Implement product data fetching

### Phase 2: Core Components
5. ✅ Build ProductGallery component
6. ✅ Build ProductInfo component
7. ✅ Build ProductActions component
8. ✅ Integrate components into main page

### Phase 3: Enhanced Features
9. ✅ Add ProductSpecs component
10. ✅ Add ProductVariants component (if needed)
11. ✅ Implement related products section
12. ✅ Add product reviews section

### Phase 4: Polish & Optimization
13. ✅ Add responsive design refinements
14. ✅ Implement SEO meta tags
15. ✅ Add structured data
16. ✅ Optimize images and performance
17. ✅ Test accessibility
18. ✅ Add error handling and loading states

---

## 8. Example Product Data Structure

```typescript
// src/data/products.ts
export const products = [
  {
    id: "dtf-transfer-basic",
    slug: "dtf-transfer-basic",
    name: "DTF Transfer - Basic",
    shortDescription: "Hochwertiger DTF-Transfer für Textilien",
    description: "Längere Beschreibung...",
    price: 2.50,
    images: [
      "/images/products/dtf-basic-1.webp",
      "/images/products/dtf-basic-2.webp"
    ],
    category: "DTF-Transfers",
    specifications: {
      material: "Premium Film",
      size: "A4",
      colors: "Full Color",
      durability: "Washable up to 50°C"
    },
    inStock: true,
    tags: ["dtf", "transfer", "textile"]
  }
];
```

---

## 9. Key DaisyUI Components Reference

### Components to Use:
- **Navigation**: `breadcrumbs` for product path
- **Layout**: `card`, `divider`, `hero`
- **Forms**: `input`, `select`, `textarea`, `checkbox`
- **Feedback**: `alert`, `badge`, `loading`
- **Data Display**: `table`, `stats`, `rating`
- **Overlay**: `modal` for image zoom, quick view
- **Navigation**: `tabs` for product details sections

---

## 10. Testing Checklist

- [ ] Product page loads correctly
- [ ] Images display and navigate properly
- [ ] Responsive design works on all devices
- [ ] Variant selection updates price (if applicable)
- [ ] Forms submit correctly
- [ ] Links to related products work
- [ ] SEO meta tags are correct
- [ ] Page performance is optimal
- [ ] Accessibility standards met
- [ ] Cross-browser compatibility

---

## 11. Future Enhancements (Optional)

- Product comparison feature
- Wishlist functionality
- Product configurator
- Live chat integration
- Product video support
- 360° product view
- Augmented reality preview
- Multi-language support
- Product bundles/packages
- Discount/promotion system

---

## Notes

- All components should follow the existing design system
- Use DaisyUI theme variables for consistency
- Maintain German language content (as per existing site)
- Follow Astro best practices for static generation
- Keep components modular and reusable
