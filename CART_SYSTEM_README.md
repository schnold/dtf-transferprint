# Shopping Cart System

## Overview
A complete, secure shopping cart system integrated into the DTF Transfer Print e-commerce platform. The system features real-time updates, persistent storage, secure price calculation, and a modern UI.

## Features

### ✅ Core Functionality
- **Add to Cart**: Users can add products with custom quantities
- **Update Quantities**: Increment/decrement quantities directly in cart dropdown
- **Remove Items**: Individual item removal with confirmation
- **Clear Cart**: Remove all items at once
- **Persistent Storage**: Cart data stored in PostgreSQL database
- **Real-time Updates**: Cart count and totals update instantly across the UI

### ✅ Security Features
- **Server-Side Price Calculation**: Prices always calculated on server, never trusted from client
- **User Authentication Required**: All cart operations require valid session
- **Ownership Verification**: Users can only access/modify their own cart items
- **SQL Injection Protection**: All queries use parameterized statements
- **Input Validation**: Comprehensive validation of all user inputs
- **Inventory Protection**: Stock validation before adding to cart
- **Session-Based Security**: HTTP-only cookies for session management

### ✅ UI/UX Features
- **Modern Cart Dropdown**: Clean, accessible dropdown interface similar to user profile
- **Visual Feedback**: Loading states, success animations, error messages
- **Cart Count Badge**: Orange notification badge when cart has items
- **Product Images**: Display product thumbnails in cart
- **Price Display**: Per-unit and total prices for each item
- **Quantity Controls**: Inline +/- buttons for easy quantity adjustment
- **Empty State**: Friendly message when cart is empty
- **Responsive Design**: Works on all screen sizes

## Architecture

### Database Schema

```sql
CREATE TABLE "cartItems" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
  "quantity" integer NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
  "unitPrice" decimal(10, 2) NOT NULL,
  "widthMm" integer,
  "heightMm" integer,
  "uploadedFileUrl" text,
  "uploadedFileName" text,
  "customOptions" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "productId")
);
```

### API Endpoints

#### POST `/api/cart/add`
Add a product to the cart.

**Request Body:**
```json
{
  "productId": "string",
  "quantity": number,
  "widthMm": number (optional),
  "heightMm": number (optional),
  "uploadedFileUrl": "string" (optional),
  "uploadedFileName": "string" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cartItem": { ... },
    "cartCount": number
  }
}
```

#### GET `/api/cart/get`
Get current user's cart items.

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "count": number,
    "subtotal": number
  }
}
```

#### PUT `/api/cart/update`
Update cart item quantity.

**Request Body:**
```json
{
  "cartItemId": "string",
  "quantity": number
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cartCount": number
  }
}
```

#### DELETE `/api/cart/remove`
Remove a specific item from cart.

**Request Body:**
```json
{
  "cartItemId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cartCount": number
  }
}
```

#### DELETE `/api/cart/clear`
Clear all items from cart.

**Response:**
```json
{
  "success": true,
  "data": {
    "cartCount": 0
  }
}
```

### Components

#### `CartDropdown.astro`
Main cart UI component with:
- Cart icon with count badge
- Dropdown menu with cart items
- Quantity controls
- Remove buttons
- Subtotal display
- Checkout/view cart buttons

#### `ProductActions.astro`
Updated with:
- Quantity selector
- "Add to Cart" button
- Loading states
- Success feedback
- Error handling

#### `Navbar.astro`
Updated to include CartDropdown component

### Database Functions

Located in `src/lib/db.ts`:

- `getCart(userId)` - Fetch user's cart items with product details
- `addToCart(userId, productId, quantity, customOptions)` - Add item to cart
- `updateCartItem(cartItemId, quantity)` - Update quantity
- `removeFromCart(cartItemId)` - Remove item
- `clearCart(userId)` - Clear all items

## Usage

### Adding to Cart from Product Page

```typescript
const response = await fetch('/api/cart/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'product-id',
    quantity: 2
  })
});

const result = await response.json();
if (result.success) {
  // Update UI
  window.dispatchEvent(new CustomEvent('cartItemAdded', { 
    detail: { cartCount: result.data.cartCount } 
  }));
}
```

### Listening for Cart Updates

```typescript
window.addEventListener('cartItemAdded', (event) => {
  const { cartCount } = event.detail;
  // Update cart badge, etc.
});

window.addEventListener('cartUpdated', (event) => {
  const { count, items, subtotal } = event.detail;
  // Update UI elements
});
```

## Price Calculation

### Server-Side Price Flow

1. Client requests to add product to cart
2. Server fetches product from database
3. Server checks for applicable price tiers based on quantity
4. Server calculates unit price (with discounts if applicable)
5. Server stores calculated price in cart
6. Price is recalculated at checkout for security

### Price Tiers

Products can have quantity-based pricing tiers:

```sql
CREATE TABLE "priceTiers" (
  "productId" text REFERENCES products(id),
  "minQuantity" integer,
  "maxQuantity" integer,
  "pricePerUnit" decimal(10, 2),
  "discountPercent" decimal(5, 2)
);
```

Example:
- 1-10 units: €10.00 each
- 11-50 units: €9.00 each (10% off)
- 51+ units: €8.00 each (20% off)

## Security Considerations

### Authentication
- All cart operations require authenticated session
- Session validated using `Astro.locals.session`
- HTTP-only cookies prevent XSS attacks

### Authorization
- Users can only access their own cart items
- All operations verify cart item ownership
- Database foreign keys ensure referential integrity

### Price Integrity
- Prices NEVER accepted from client
- All prices calculated server-side from database
- Price tiers applied server-side
- Final prices recalculated at checkout

### Input Validation
- Product IDs validated against database
- Quantities constrained (1-100)
- Dimensions validated against product limits
- All inputs sanitized and type-checked

### SQL Injection Prevention
- Parameterized queries throughout
- No string concatenation for SQL
- Database driver handles escaping

## Testing

### Manual Testing Checklist
- [ ] Add product to cart (logged in)
- [ ] Add product to cart (logged out - should prompt login)
- [ ] Increase/decrease quantity in cart dropdown
- [ ] Remove item from cart
- [ ] Add same product twice (should update quantity)
- [ ] Test with products having price tiers
- [ ] Test cart persistence across page refreshes
- [ ] Test cart count badge updates
- [ ] Test subtotal calculation
- [ ] Test empty cart state

### Security Testing
- [ ] Try to access another user's cart
- [ ] Attempt to manipulate prices from client
- [ ] Test SQL injection in product IDs
- [ ] Test invalid quantities (negative, zero, huge numbers)
- [ ] Verify session expiry handling

## Deployment

### Environment Variables Required
```env
NEON_DATABASE=postgresql://...
```

### Database Migration
Run migrations before deployment:
```bash
npm run migrate
```

### Production Checklist
- [ ] SSL/TLS enabled
- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] Rate limiting configured
- [ ] Monitoring/logging enabled
- [ ] Security headers configured
- [ ] Error reporting set up

## Future Enhancements

### Planned Features
- [ ] Cart expiry (auto-clear old items)
- [ ] Save for later functionality
- [ ] Product recommendations in cart
- [ ] Bulk operations (select multiple items)
- [ ] Apply discount codes in cart
- [ ] Shipping cost calculator
- [ ] Tax calculation
- [ ] Guest cart (convert to user cart on login)
- [ ] Cart sharing functionality
- [ ] Email cart reminder

### Performance Optimizations
- [ ] Cart caching with Redis
- [ ] Lazy loading cart items
- [ ] Optimistic UI updates
- [ ] WebSocket for real-time sync
- [ ] CDN for product images

## Troubleshooting

### Cart Count Not Updating
1. Check browser console for JavaScript errors
2. Verify API endpoints are returning correct data
3. Check authentication session is valid
4. Clear browser cache and cookies

### Prices Incorrect
1. Verify price tiers in database
2. Check product base price
3. Review price calculation logic in API
4. Check for database decimal precision issues

### Items Not Adding to Cart
1. Confirm user is authenticated
2. Check product exists and is active
3. Verify inventory if stock tracking enabled
4. Review API error messages in network tab

### Cart Not Persisting
1. Check database connection
2. Verify session is maintained
3. Check cart table foreign keys
4. Review migration status

## Support

For issues or questions:
- Create an issue in the repository
- Review security documentation in `CART_SECURITY.md`
- Check API documentation above
- Review database schema

## License

[Your License Here]

---

**Last Updated**: January 12, 2026
**Version**: 1.0.0
