# Shopping Cart System Flow Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐  │
│  │   Navbar     │────▶│ CartDropdown │◀────│  Product     │  │
│  │   (Header)   │     │   Component  │     │   Actions    │  │
│  └──────────────┘     └──────────────┘     └──────────────┘  │
│         │                     │                     │          │
│         │                     │                     │          │
│         └─────────────────────┼─────────────────────┘          │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │  Client-Side Events  │
                    │  - cartItemAdded     │
                    │  - cartUpdated       │
                    └───────────┬──────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────┐
│                               │         API LAYER               │
├───────────────────────────────┼─────────────────────────────────┤
│                               │                                 │
│  ┌────────────────────────────▼─────────────────────────────┐  │
│  │                     API Endpoints                         │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  POST   /api/cart/add      ─┐                           │  │
│  │  GET    /api/cart/get       │                           │  │
│  │  PUT    /api/cart/update    ├─ Auth Check Required      │  │
│  │  DELETE /api/cart/remove    │                           │  │
│  │  DELETE /api/cart/clear    ─┘                           │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                              │      BUSINESS LOGIC              │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │                   Database Functions                     │  │
│  │                    (src/lib/db.ts)                       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • getCart(userId)                                       │  │
│  │  • addToCart(userId, productId, quantity, customOpts)   │  │
│  │  • updateCartItem(cartItemId, quantity)                 │  │
│  │  • removeFromCart(cartItemId)                           │  │
│  │  • clearCart(userId)                                    │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │              Security & Validation Layer                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  ✓ Authentication Check                                  │  │
│  │  ✓ Ownership Verification                               │  │
│  │  ✓ Price Calculation (Server-Side)                      │  │
│  │  ✓ Inventory Validation                                 │  │
│  │  ✓ Input Sanitization                                   │  │
│  │  ✓ SQL Injection Prevention                             │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                              │      DATABASE LAYER              │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │                    PostgreSQL Database                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  ┌─────────────┐    ┌──────────┐    ┌───────────────┐  │  │
│  │  │   user      │    │ products │    │  priceTiers   │  │  │
│  │  │  (auth)     │    │          │    │               │  │  │
│  │  └──────┬──────┘    └─────┬────┘    └───────┬───────┘  │  │
│  │         │                 │                  │          │  │
│  │         │    ┌────────────▼──────────────┐   │          │  │
│  │         └───▶│      cartItems            │◀──┘          │  │
│  │              ├───────────────────────────┤              │  │
│  │              │ id (PK)                   │              │  │
│  │              │ userId (FK → user)        │              │  │
│  │              │ productId (FK → products) │              │  │
│  │              │ quantity                  │              │  │
│  │              │ unitPrice                 │              │  │
│  │              │ widthMm                   │              │  │
│  │              │ heightMm                  │              │  │
│  │              │ uploadedFileUrl           │              │  │
│  │              │ uploadedFileName          │              │  │
│  │              │ customOptions (jsonb)     │              │  │
│  │              │ createdAt                 │              │  │
│  │              │ updatedAt                 │              │  │
│  │              └───────────────────────────┘              │  │
│  │                                                          │  │
│  │  Constraints:                                            │  │
│  │  • UNIQUE (userId, productId)                           │  │
│  │  • CHECK (quantity > 0)                                 │  │
│  │  • ON DELETE CASCADE                                    │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow: Adding Product to Cart

```
┌────────────┐
│   START    │
│   User on  │
│  Product   │
│    Page    │
└─────┬──────┘
      │
      ▼
┌──────────────────┐
│ Is user logged   │───No───▶┌─────────────────┐
│      in?         │         │ Show login      │
└─────┬────────────┘         │ modal/prompt    │
      │                      └─────────────────┘
      Yes
      │
      ▼
┌──────────────────┐
│ User selects     │
│ quantity (1-100) │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Click "Add to    │
│ Cart" button     │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Button shows     │
│ loading spinner  │
└─────┬────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│     POST /api/cart/add                   │
│  ┌────────────────────────────────────┐  │
│  │ 1. Validate user session           │  │
│  │ 2. Validate product exists & active│  │
│  │ 3. Check inventory (if tracked)    │  │
│  │ 4. Get price from database         │  │
│  │ 5. Apply price tiers (if any)      │  │
│  │ 6. Insert/Update cart item         │  │
│  │ 7. Return cart count               │  │
│  └────────────────────────────────────┘  │
└─────┬────────────────────────────────────┘
      │
      ▼
┌──────────────────┐
│   Success?       │───No───▶┌─────────────────┐
└─────┬────────────┘         │ Show error      │
      │                      │ message         │
      Yes                    └─────────────────┘
      │
      ▼
┌──────────────────┐
│ Button turns     │
│ green with       │
│ checkmark        │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Dispatch         │
│ "cartItemAdded"  │
│ event            │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Cart badge       │
│ updates in       │
│ navbar           │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Button resets    │
│ after 2 seconds  │
└─────┬────────────┘
      │
      ▼
┌────────────┐
│    DONE    │
└────────────┘
```

## Cart Dropdown Flow

```
┌────────────┐
│   User     │
│  hovers    │
│   over     │
│  cart      │
│   icon     │
└─────┬──────┘
      │
      ▼
┌──────────────────┐
│ Dropdown opens   │
│ with CSS :hover  │
└─────┬────────────┘
      │
      ▼
┌──────────────────────────┐
│ Has items in cart?       │───No───▶┌─────────────────┐
└─────┬────────────────────┘         │ Show empty      │
      │                              │ cart message    │
      Yes                            └─────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Display cart items:      │
│ • Product image          │
│ • Product name           │
│ • Unit price             │
│ • Quantity controls      │
│ • Remove button          │
│ • Item total             │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Show subtotal            │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Show action buttons:     │
│ • "Zur Kasse" (checkout) │
│ • "Warenkorb ansehen"    │
└──────────────────────────┘
```

## Update Quantity Flow

```
┌────────────┐
│   User     │
│  clicks    │
│   + or -   │
│  button    │
└─────┬──────┘
      │
      ▼
┌──────────────────────────┐
│ Update quantity in UI    │
│ (optimistic update)      │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│   PUT /api/cart/update               │
│  ┌────────────────────────────────┐  │
│  │ 1. Validate user session       │  │
│  │ 2. Verify cart item ownership  │  │
│  │ 3. Update quantity in DB       │  │
│  │    (or delete if quantity=0)   │  │
│  │ 4. Return new cart count       │  │
│  └────────────────────────────────┘  │
└─────┬────────────────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Dispatch "cartUpdated"   │
│ event                    │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Update cart count badge  │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Recalculate subtotal     │
└─────┬────────────────────┘
      │
      ▼
┌────────────┐
│    DONE    │
└────────────┘
```

## Security Flow

```
┌──────────────────┐
│ API Request      │
│ Received         │
└─────┬────────────┘
      │
      ▼
┌──────────────────────────┐
│ Check Session            │
│ (Astro.locals.session)   │
└─────┬────────────────────┘
      │
      ├─No─▶┌──────────────────┐
      │     │ Return 401       │
      │     │ Unauthorized     │
      │     └──────────────────┘
      │
      Yes
      │
      ▼
┌──────────────────────────┐
│ Extract userId from      │
│ session                  │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Validate Input:          │
│ • productId exists?      │
│ • quantity valid?        │
│ • dimensions valid?      │
└─────┬────────────────────┘
      │
      ├─No─▶┌──────────────────┐
      │     │ Return 400       │
      │     │ Bad Request      │
      │     └──────────────────┘
      │
      Yes
      │
      ▼
┌──────────────────────────┐
│ Fetch Product from DB    │
│ (never trust client)     │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Check Inventory          │
│ (if tracking enabled)    │
└─────┬────────────────────┘
      │
      ├─No─▶┌──────────────────┐
      │     │ Return 400       │
      │     │ Insufficient     │
      │     │ Inventory        │
      │     └──────────────────┘
      │
      Yes
      │
      ▼
┌──────────────────────────┐
│ Calculate Price:         │
│ • Get base price from DB │
│ • Apply price tiers      │
│ • Server-side only!      │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Insert/Update cartItems  │
│ with parameterized query │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ Return Success Response  │
│ with cart count          │
└─────┬────────────────────┘
      │
      ▼
┌────────────┐
│    DONE    │
└────────────┘
```

## Data Flow

```
CLIENT                   SERVER                   DATABASE
  │                         │                         │
  │  POST /api/cart/add     │                         │
  ├────────────────────────▶│                         │
  │                         │                         │
  │                         │  SELECT * FROM products │
  │                         │  WHERE id = $1          │
  │                         ├────────────────────────▶│
  │                         │                         │
  │                         │  ◀─── Product Data ───  │
  │                         │                         │
  │                         │  SELECT * FROM          │
  │                         │  priceTiers WHERE...    │
  │                         ├────────────────────────▶│
  │                         │                         │
  │                         │  ◀─── Price Tier ─────  │
  │                         │                         │
  │                         │  INSERT INTO cartItems  │
  │                         │  VALUES (...)           │
  │                         ├────────────────────────▶│
  │                         │                         │
  │                         │  ◀─── Cart Item ──────  │
  │                         │                         │
  │  ◀─── Success JSON ────│                         │
  │  { cartCount: 1 }       │                         │
  │                         │                         │
  │  Event: cartItemAdded   │                         │
  │                         │                         │
  │  GET /api/cart/get      │                         │
  ├────────────────────────▶│                         │
  │                         │                         │
  │                         │  SELECT ci.*, p.name    │
  │                         │  FROM cartItems ci      │
  │                         │  JOIN products p...     │
  │                         ├────────────────────────▶│
  │                         │                         │
  │                         │  ◀─── Cart Items ─────  │
  │                         │                         │
  │  ◀─── Cart Data ───────│                         │
  │  { items: [...] }       │                         │
  │                         │                         │
```

## Event System

```
┌─────────────────────────────────────────────────────┐
│              Browser Window Events                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  cartItemAdded Event                                │
│  ────────────────────                               │
│  Triggered: When item added to cart                 │
│  Data: { cartCount }                                │
│  Listeners:                                         │
│    • CartDropdown (update badge)                    │
│    • Navbar (update icon state)                     │
│    • Analytics (track addition)                     │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  cartUpdated Event                                  │
│  ──────────────────                                 │
│  Triggered: When cart changes (update/remove)       │
│  Data: { count, items, subtotal }                   │
│  Listeners:                                         │
│    • CartDropdown (refresh items)                   │
│    • Cart Page (if open)                            │
│    • Checkout Page (if open)                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Component Interaction

```
                Navbar.astro
                     │
        ┌────────────┼────────────┐
        │                         │
        ▼                         ▼
  CartDropdown.astro      UserDropdown
        │
        ├─ Cart Icon with Badge
        │
        └─ Dropdown Menu
             │
             ├─ Cart Items List
             │   │
             │   └─ For each item:
             │       ├─ Product Image
             │       ├─ Product Name (link)
             │       ├─ Unit Price
             │       ├─ Quantity Controls
             │       └─ Remove Button
             │
             ├─ Subtotal Display
             │
             └─ Action Buttons
                 ├─ "Zur Kasse"
                 └─ "Warenkorb ansehen"


    ProductActions.astro
         │
         ├─ Quantity Selector
         │   ├─ Decrease Button (-)
         │   ├─ Number Input
         │   └─ Increase Button (+)
         │
         ├─ Add to Cart Button
         │   ├─ Normal State
         │   ├─ Loading State
         │   └─ Success State
         │
         └─ Quote Button
```

## Price Calculation Flow

```
┌───────────────────────┐
│  User adds product    │
│  with quantity: 15    │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  Server: Fetch product from DB        │
│  basePrice: €10.00                    │
└──────────┬────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  Server: Query price tiers            │
│  WHERE productId = X                  │
│  AND minQuantity <= 15                │
│  AND maxQuantity >= 15                │
└──────────┬────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  Found tier:                          │
│  minQty: 10, maxQty: 50               │
│  pricePerUnit: €9.00                  │
│  discountPercent: 10%                 │
└──────────┬────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  Calculate:                           │
│  unitPrice = €9.00                    │
│  total = €9.00 × 15 = €135.00         │
└──────────┬────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  Store in cartItems:                  │
│  unitPrice: €9.00 (server-calculated) │
│  quantity: 15                         │
└───────────────────────────────────────┘

❌ NEVER: Accept price from client
✅ ALWAYS: Calculate price on server
```

---

This flow diagram shows how all components interact to create a secure, functional shopping cart system.
