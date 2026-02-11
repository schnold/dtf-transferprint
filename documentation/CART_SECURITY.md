# Cart System Security Documentation

## Overview
This document outlines the security measures implemented in the e-commerce cart system to prevent exploits and ensure data integrity.

## Security Measures

### 1. Authentication & Authorization
- **User Authentication Required**: All cart operations require a valid authenticated session
- **Session Validation**: Uses `Astro.locals.user` and `Astro.locals.session` for server-side session verification
- **User Ownership Verification**: All cart operations verify that the cart item belongs to the authenticated user before allowing modifications

```typescript
// Example from cart API endpoints
const userId = session?.user?.id;
if (!userId) {
  return new Response(JSON.stringify({
    success: false,
    error: { message: 'Unauthorized - Please log in' }
  }), { status: 401 });
}
```

### 2. Server-Side Price Calculation
- **Prices Never Trusted from Client**: All prices are calculated and validated on the server
- **Database Price Retrieval**: Product prices are always fetched from the database, never from client input
- **Price Tier Application**: Discounts based on quantity are calculated server-side using the `priceTiers` table

```typescript
// Server-side price calculation
const priceTierResult = await client.query(`
  SELECT * FROM "priceTiers"
  WHERE "productId" = $1 AND "minQuantity" <= $2 AND ("maxQuantity" IS NULL OR "maxQuantity" >= $2)
  ORDER BY "minQuantity" DESC LIMIT 1
`, [productId, quantity]);

const unitPrice = priceTierResult.rows.length > 0 
  ? parseFloat(priceTierResult.rows[0].pricePerUnit)
  : parseFloat(product.basePrice);
```

### 3. Input Validation
- **Quantity Validation**: Enforced minimum (1) and maximum (100) quantities
- **Product Validation**: Verifies product exists and is active before adding to cart
- **Dimension Validation**: Custom dimensions are validated against product constraints
- **Type Safety**: All numeric inputs are parsed and validated

```typescript
// Input validation examples
if (!productId || !quantity || quantity < 1) {
  return new Response(JSON.stringify({
    success: false,
    error: { message: 'Product ID and quantity are required' }
  }), { status: 400 });
}

// Dimension validation
if (widthMm && product.maxWidthMm && widthMm > product.maxWidthMm) {
  return new Response(JSON.stringify({
    success: false,
    error: { message: `Width cannot exceed ${product.maxWidthMm}mm` }
  }), { status: 400 });
}
```

### 4. Database Security
- **SQL Injection Prevention**: All queries use parameterized statements
- **Foreign Key Constraints**: Cart items reference valid users and products with cascade deletion
- **Unique Constraints**: Prevents duplicate cart entries (user + product combination)
- **Check Constraints**: Ensures quantity is always positive

```sql
CREATE TABLE "cartItems" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "productId" text not null references "products" ("id") on delete cascade,
  "quantity" integer not null default 1 check ("quantity" > 0),
  ...
);
```

### 5. Inventory Protection
- **Stock Validation**: Checks inventory before adding to cart
- **Inventory Policy Enforcement**: Respects product inventory policies
- **Real-time Validation**: Validates stock levels during checkout process

```typescript
if (product.trackInventory && product.inventoryPolicy === 'deny') {
  if (product.inventoryQuantity < quantity) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: `Insufficient inventory. Only ${product.inventoryQuantity} available.` }
    }), { status: 400 });
  }
}
```

### 6. Data Isolation
- **User Cart Isolation**: Users can only access and modify their own cart items
- **Query Filtering**: All cart queries filter by authenticated user ID
- **Ownership Verification**: Update and delete operations verify ownership before execution

```typescript
// Verify cart item belongs to user
const verifyResult = await client.query(
  'SELECT * FROM "cartItems" WHERE id = $1 AND "userId" = $2',
  [cartItemId, userId]
);

if (verifyResult.rows.length === 0) {
  return new Response(JSON.stringify({
    success: false,
    error: { message: 'Cart item not found' }
  }), { status: 404 });
}
```

### 7. Rate Limiting (Recommended)
While not currently implemented, consider adding:
- API rate limiting per user/IP
- CAPTCHA for suspicious activity
- Throttling on cart modifications

### 8. XSS Prevention
- **Content Sanitization**: All user inputs are properly escaped in the UI
- **CSP Headers**: Should be configured in production
- **Safe HTML Rendering**: Astro's built-in XSS protection

### 9. CSRF Protection
- **Same-Origin Policy**: API endpoints require valid session cookies
- **CORS Configuration**: Properly configured in production
- **Session-Based Auth**: Uses HTTP-only cookies for session management

## API Endpoints Security Summary

### POST `/api/cart/add`
- ✅ Authentication required
- ✅ Server-side price calculation
- ✅ Product validation
- ✅ Inventory checking
- ✅ Dimension validation
- ✅ SQL injection protected

### GET `/api/cart/get`
- ✅ Authentication required
- ✅ User isolation
- ✅ SQL injection protected

### PUT `/api/cart/update`
- ✅ Authentication required
- ✅ Ownership verification
- ✅ Quantity validation
- ✅ SQL injection protected

### DELETE `/api/cart/remove`
- ✅ Authentication required
- ✅ Ownership verification
- ✅ SQL injection protected

### DELETE `/api/cart/clear`
- ✅ Authentication required
- ✅ User isolation
- ✅ SQL injection protected

## Client-Side Security

### 1. Limited Trust
- Client-side code only handles UI/UX
- All critical operations happen server-side
- Prices displayed are for UI only, recalculated on checkout

### 2. Event-Driven Updates
- Cart updates trigger UI refresh from server data
- No sensitive data stored in localStorage
- Real-time synchronization with server state

### 3. Error Handling
- Graceful error messages without exposing system details
- Development vs Production error verbosity
- User-friendly error messages

## Recommendations for Production

1. **Enable SSL/TLS**: All cart operations over HTTPS only
2. **Implement Rate Limiting**: Prevent abuse and brute force attempts
3. **Add Monitoring**: Log suspicious cart activities
4. **Regular Security Audits**: Review and update security measures
5. **Environment Variables**: Keep all sensitive data in env vars
6. **Database Backups**: Regular backups of cart and order data
7. **Session Expiry**: Implement appropriate session timeout
8. **Payment Integration**: Use PCI-compliant payment processors
9. **GDPR Compliance**: Implement data privacy measures
10. **Security Headers**: Configure CSP, HSTS, X-Frame-Options, etc.

## Testing Security

### Manual Testing Checklist
- [ ] Try to add items without authentication
- [ ] Attempt to modify another user's cart
- [ ] Try SQL injection in product IDs
- [ ] Test with invalid quantities (negative, zero, excessive)
- [ ] Verify prices cannot be manipulated from client
- [ ] Test concurrent cart modifications
- [ ] Verify inventory constraints are enforced
- [ ] Test dimension validation boundaries
- [ ] Check for XSS vulnerabilities in product names
- [ ] Verify session expiry handling

### Automated Testing
Consider implementing:
- Unit tests for API endpoints
- Integration tests for cart workflows
- Security scanning tools (OWASP ZAP, Burp Suite)
- Penetration testing

## Incident Response

If a security issue is discovered:
1. Document the vulnerability
2. Assess the impact
3. Implement a fix
4. Test the fix thoroughly
5. Deploy to production
6. Notify affected users if necessary
7. Review and update security measures

## Contact

For security concerns, contact: [security@yourdomain.com]

---

**Last Updated**: January 12, 2026
**Version**: 1.0
