# Cart System Testing Guide

## Prerequisites
1. Server running: `npm run dev`
2. Database migrated: `npm run migrate`
3. Test user account created
4. At least one active product in database

## Test Scenarios

### Test 1: Add Product to Cart (Authenticated)
**Steps:**
1. Navigate to http://localhost:4321
2. Log in with test account
3. Navigate to a product page (e.g., /product/dtf-transfer-meterware)
4. Set quantity to 2
5. Click "In den Warenkorb" button

**Expected Results:**
- Button shows loading spinner
- Button changes to green with checkmark "Hinzugefügt!"
- Cart badge in navbar shows "1" (orange badge)
- Button resets after 2 seconds

**Verify:**
- Open cart dropdown by hovering over cart icon
- Should see product with quantity 2
- Price should match product price × 2
- Subtotal should be correct

---

### Test 2: Add Product to Cart (Not Authenticated)
**Steps:**
1. Log out if logged in
2. Navigate to a product page
3. Click "In den Warenkorb" button

**Expected Results:**
- Alert: "Bitte melden Sie sich an, um Produkte in den Warenkorb zu legen."
- Login modal opens
- No item added to cart

---

### Test 3: Update Quantity in Cart Dropdown
**Steps:**
1. Ensure logged in with item in cart
2. Hover over cart icon to open dropdown
3. Click "+" button next to quantity
4. Wait for update
5. Click "-" button

**Expected Results:**
- Quantity updates immediately in UI
- Cart count badge updates
- Subtotal recalculates
- No page refresh required

---

### Test 4: Remove Item from Cart
**Steps:**
1. Ensure logged in with item in cart
2. Open cart dropdown
3. Click trash icon on cart item
4. Confirm removal in alert dialog

**Expected Results:**
- Confirmation dialog appears
- Item removed from dropdown
- Cart count updates
- If last item: "Warenkorb ist leer" message shown

---

### Test 5: Cart Persistence
**Steps:**
1. Add item to cart
2. Note the cart count
3. Refresh the page
4. Check cart dropdown

**Expected Results:**
- Cart count same after refresh
- Items still in dropdown
- Quantities unchanged
- Prices unchanged

---

### Test 6: Price Tiers (if configured)
**Steps:**
1. Navigate to product with price tiers
2. Add quantity 1 - note price
3. Update to quantity 11 (if tier at 10+)
4. Check price per unit updates

**Expected Results:**
- Price per unit decreases at tier threshold
- Total reflects discounted price
- Discount badge shows (if applicable)

---

### Test 7: Multiple Products
**Steps:**
1. Add Product A (quantity 2)
2. Navigate to Product B
3. Add Product B (quantity 1)
4. Open cart dropdown

**Expected Results:**
- Cart shows 2 items
- Cart count badge shows "2"
- Both products listed
- Subtotal is sum of all items

---

### Test 8: Add Same Product Twice
**Steps:**
1. Add Product A (quantity 1)
2. Navigate away and back
3. Add Product A again (quantity 1)

**Expected Results:**
- Cart still shows 1 item
- Quantity is now 2
- NOT duplicate entries

---

### Test 9: Security - Another User's Cart
**Manual API Test:**
```bash
# Get your cart item ID while logged in as User A
# Log in as User B
# Try to update User A's cart item

curl -X PUT http://localhost:4321/api/cart/update \
  -H "Content-Type: application/json" \
  -d '{"cartItemId": "user-a-cart-item-id", "quantity": 999}'
```

**Expected Result:**
- 404 Not Found
- Error: "Cart item not found"

---

### Test 10: Security - Price Manipulation
**Manual API Test:**
```bash
# Try to add product with fake price
curl -X POST http://localhost:4321/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productId": "valid-product-id", "quantity": 1, "unitPrice": 0.01}'
```

**Expected Result:**
- Item added but with server-calculated price
- Custom price ignored
- Correct price from database used

---

### Test 11: Invalid Inputs
**Test Cases:**
1. Quantity = 0
2. Quantity = -5
3. Quantity = 1000
4. Invalid product ID
5. Non-numeric quantity

**Expected Results:**
- Appropriate error messages
- No cart corruption
- Graceful error handling

---

### Test 12: Inventory Checking (if enabled)
**Steps:**
1. Find product with inventory tracking
2. Note available quantity
3. Try to add more than available

**Expected Results:**
- Error message: "Insufficient inventory. Only X available."
- Item not added to cart
- Inventory protected

---

### Test 13: Empty Cart State
**Steps:**
1. Ensure cart is empty
2. Open cart dropdown

**Expected Results:**
- Shopping bag icon displayed
- Message: "Warenkorb ist leer"
- Button: "Produkte ansehen"
- No cart count badge

---

### Test 14: Cart Dropdown UI/UX
**Check:**
- [ ] Dropdown appears on hover
- [ ] Dropdown stays open when hovering over it
- [ ] Dropdown closes when clicking outside
- [ ] Images load correctly
- [ ] Buttons have hover states
- [ ] Responsive on mobile
- [ ] Accessible (keyboard navigation)
- [ ] Colors match design system

---

### Test 15: Real-time Updates
**Steps:**
1. Open cart dropdown in one browser window
2. Open same site in another window (same user)
3. Add item in window 2
4. Refresh window 1

**Expected Results:**
- Cart updates in window 1 after refresh
- Cart count reflects changes
- Items match across windows

---

## Database Verification

### Check Cart in Database
```sql
-- View all cart items for a user
SELECT 
  ci.*,
  p.name as product_name,
  p."basePrice" as base_price
FROM "cartItems" ci
JOIN products p ON ci."productId" = p.id
WHERE ci."userId" = 'your-user-id';
```

### Check Price Storage
```sql
-- Verify prices are stored correctly
SELECT 
  ci."unitPrice",
  p."basePrice",
  ci.quantity,
  (ci."unitPrice" * ci.quantity) as total
FROM "cartItems" ci
JOIN products p ON ci."productId" = p.id;
```

---

## Performance Testing

### Load Testing
1. Add 10 items to cart
2. Update quantities multiple times
3. Check response times
4. Monitor database queries

**Acceptable Performance:**
- API responses < 200ms
- UI updates feel instant
- No memory leaks
- Database queries optimized

---

## Browser Console Tests

### Check for Errors
```javascript
// Open browser console and verify:
// 1. No JavaScript errors
// 2. API calls succeed
// 3. Events fire correctly

// Test event listener
window.addEventListener('cartUpdated', (e) => {
  console.log('Cart updated:', e.detail);
});

// Test adding to cart
// Click "Add to Cart" and watch console
```

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Can tab to cart icon
- [ ] Can open dropdown with Enter/Space
- [ ] Can navigate items with Tab
- [ ] Can activate buttons with Enter/Space
- [ ] Proper focus indicators

### Screen Reader
- [ ] Cart icon has aria-label
- [ ] Button labels are descriptive
- [ ] Status updates announced
- [ ] Error messages announced

---

## Mobile Testing

### Responsive Design
- [ ] Cart dropdown width appropriate
- [ ] Touch targets large enough (min 44×44px)
- [ ] No horizontal scrolling
- [ ] Readable font sizes
- [ ] Easy to tap quantity buttons

### Mobile Browsers
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] Firefox (Android)
- [ ] Edge (mobile)

---

## Regression Testing

After any changes, re-run:
1. Tests 1-5 (core functionality)
2. Test 9-10 (security)
3. Test 14 (UI/UX)

---

## Bug Reporting Template

```markdown
**Bug Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Browser: 
- OS: 
- User Type: [Logged in/Logged out]

**Screenshots/Videos:**
[If applicable]

**Console Errors:**
[Any JavaScript errors from console]

**API Response:**
[Network tab - relevant API calls]
```

---

## Success Criteria

All tests pass when:
- ✅ Users can add products to cart
- ✅ Cart persists across sessions
- ✅ Quantities can be updated
- ✅ Items can be removed
- ✅ Prices calculated server-side
- ✅ Security measures prevent exploits
- ✅ UI is responsive and accessible
- ✅ No JavaScript errors
- ✅ Performance is acceptable
- ✅ Database integrity maintained

---

**Testing Date**: ___________
**Tested By**: ___________
**Version**: 1.0.0
**Pass/Fail**: ___________
