# Security Test Checklist

Use this checklist to run security tests. Mark each item when done and note Pass/Fail and any findings.

---

## 1. Authentication and session

### 1.1 Session fixation / tampering
- [ ] **Test**: Log in as normal user, capture session cookie. Try to access `/admin` (or an admin page). Expect redirect to login or 403.
- [ ] **Test**: In browser dev tools, inspect session cookie; confirm no editable `isAdmin` in client-visible payload (session should be server-side or signed).
- [ ] **Expected**: Admin pages and API require valid session; admin status re-checked from DB for page access (see `middleware.ts`).
- **Result**: _____

### 1.2 Privilege escalation (normal user → admin API)
- [ ] **Test**: Log in as non-admin user. Call `GET /api/admin/orders` (e.g. with fetch or Postman) using that user’s session cookie.
- [ ] **Expected**: 401 Unauthorized or 403 Forbidden; no order data returned.
- [ ] **Test**: Repeat for `GET /api/admin/form-requests`, `GET /api/admin/products`, `POST /api/admin/categories/create` (with body).
- [ ] **Expected**: All return 401/403 for non-admin.
- **Result**: _____

### 1.3 Block password brute force
- [ ] **Test**: With `BLOCK_PASSWORD` set, send 20+ POST requests to `/api/block-auth` with wrong password (e.g. script or Postman runner).
- [ ] **Expected**: No rate limit (if none implemented, note as finding). No timing leak (optional: measure response time variance).
- [ ] **Test**: Verify password comparison is not simple string compare (code review: `block-auth.ts`).
- **Result**: _____

### 1.4 Credential stuffing / account lockout
- [ ] **Test**: Attempt 5+ failed logins with same email on login page. Check if account is locked or rate limited.
- [ ] **Code review**: In `src/lib/auth.ts`, confirm better-auth config for rate limiting or lockout if applicable.
- **Result**: _____

---

## 2. Input and injection

### 2.1 SQL injection
- [ ] **Test**: In contact form, submit name or message containing: `' OR '1'='1` or `'; DROP TABLE form_requests;--`. Submit and check DB and response.
- [ ] **Expected**: No error; data stored safely (parameterized). No SQL error or table drop.
- [ ] **Test**: In cart add API (if you have a way to send productId), try productId = `1; DELETE FROM "cartItems";--`. Expect 400 or “not found”, no deletion.
- [ ] **Code review**: Grep `client.query(` in `src/lib/db.ts` and API routes; confirm all user input uses `$1, $2, ...` parameters, no string concatenation.
- **Result**: _____

### 2.2 XSS in stored/reflected content (UI)
- [ ] **Test**: In contact/inquiry form submit: name = `<script>alert(1)</script>`, message = `<img src=x onerror=alert(1)>`. Open admin “Anfragen” (or wherever submissions are shown); check if script runs.
- [ ] **Expected**: Script does not execute; content is escaped (e.g. shown as text).
- [ ] **Test**: If cart/product names are user-controlled or from DB, inject same payload where displayed; confirm no execution.
- **Result**: _____

### 2.3 XSS in emails (contact, inquiry, product-inquiry)
- [ ] **Test**: Submit contact form with name = `<script>alert(1)</script>`, message = `<img src=x onerror=alert(1)>`. Check received email (HTML view).
- [ ] **Expected**: Tags appear escaped or as plain text; no script execution in email client.
- [ ] **Code review**: In `contact.ts`, `inquiry.ts`, `product-inquiry.ts`, confirm all user fields (name, email, message, subject, etc.) are escaped (e.g. `escapeHtml`) before being inserted into HTML email body.
- **Result**: _____

### 2.4 Input length / DoS
- [ ] **Test**: Submit contact form with message length 1,000,000 characters (or 10 MB). Check response and server behavior.
- [ ] **Expected**: Either 400 or 413, or a max-length validation error; server does not hang or crash.
- [ ] **Test**: Submit with very long name (e.g. 10,000 chars). Same expectation.
- [ ] **Code review**: Confirm contact, inquiry, product-inquiry enforce max length on all text fields (or use `src/lib/validation.ts`).
- **Result**: _____

### 2.5 Open redirect (tracking URLs)
- [ ] **Test**: If admin can set tracking URL for an order, set URL to `https://evil.com/phish`. Save and open link (e.g. in order status email or admin). Confirm it’s blocked or only allowlisted domains accepted.
- [ ] **Code review**: In `src/lib/db.ts`, confirm `validateTrackingUrl` (or equivalent) allows only trusted carrier domains; reject others.
- **Result**: _____

---

## 3. File and path security

### 3.1 Path traversal (image proxy)
- [ ] **Test**: Request `GET /api/images/../../../etc/passwd` or `GET /api/images/..%2F..%2Fdesign-files/other-user/file.png`. Check response.
- [ ] **Expected**: 400 Bad Request or 404; no content from outside intended R2 prefix.
- [ ] **Test**: If you have a known image at `product-images/xyz.jpg`, try `GET /api/images/product-images/..%2Fdesign-files/...` and confirm no cross-folder access.
- [ ] **Code review**: In `src/pages/api/images/[...path].ts`, confirm key is validated: no `..`, and optionally restricted to allowlisted prefix(es).
- **Result**: _____

### 3.2 Unrestricted file upload (design file)
- [ ] **Test**: Upload a file named `image.png` with content that is actually a script (e.g. `.js` or executable). Expect rejection.
- [ ] **Test**: Upload a 50 MB file (if no limit). Expect rejection or size error.
- [ ] **Test**: Upload valid PDF and valid PNG; expect success. Then upload `.exe` renamed to `.pdf`; expect rejection (magic-byte or extension check).
- [ ] **Code review**: In `upload/design-file.ts` and `file-metadata.ts`, confirm: allowed types (PDF/PNG), max size, and content/magic-byte validation.
- **Result**: _____

### 3.3 Malicious file content (parser/script)
- [ ] **Test**: Upload a PNG with embedded script or polyglot content if you have a sample. Confirm it’s rejected or sanitized.
- [ ] **Code review**: Confirm Sharp (PNG) and PDF handling don’t execute code; PDF validation beyond header if possible.
- **Result**: _____

---

## 4. Payment and commerce

### 4.1 Price manipulation
- [ ] **Test**: Add product to cart via UI. In browser, intercept or replay “add to cart” request with modified `unitPrice` or `total` in body. Complete checkout (or get to summary). Check final amount.
- [ ] **Expected**: Total is calculated from server/DB only; client-supplied price is ignored.
- [ ] **Code review**: In `cart/add.ts`, `create-paypal-order.ts`, `capture-paypal-payment.ts`, confirm prices come only from DB/session computed server-side.
- **Result**: _____

### 4.2 PayPal session hijack / replay
- [ ] **Test**: Start checkout as User A; get `paypalOrderId` from create response. As User B (different session), send capture request with same `paypalOrderId`. Expect 403 (session belongs to User A).
- [ ] **Test**: Create PayPal order, wait longer than session expiry (e.g. 1 hour if so configured), then call capture. Expect 400 “session expired”.
- [ ] **Code review**: In `capture-paypal-payment.ts`, confirm session is bound to `userId` and expiry is checked; idempotency when already captured.
- **Result**: _____

### 4.3 Rate limiting on payment
- [ ] **Test**: Send 15+ POST requests to `/api/checkout/create-paypal-order` within 5 minutes (same user/session). Expect 429 after limit (e.g. 10).
- [ ] **Test**: Send 10+ POST requests to `/api/checkout/capture-paypal-payment` within 5 minutes. Expect 429 after limit (e.g. 5).
- [ ] **Code review**: Confirm `rate-limiter.ts` is used in both endpoints and limits match SECURITY_FIXES.md.
- **Result**: _____

---

## 5. Authorization and IDOR

### 5.1 Cart IDOR
- [ ] **Test**: As User A, add item to cart and note `cartItemId`. As User B, send DELETE or PUT to remove/update that `cartItemId`. Expect 404 or 403.
- [ ] **Test**: As User B, call GET `/api/cart/get`; confirm no items from User A.
- **Result**: _____

### 5.2 Order IDOR
- [ ] **Test**: As User A, complete an order and note order ID or order number. As User B, try to access that order (e.g. GET order detail by ID/number). Expect 403/404.
- **Result**: _____

### 5.3 Address IDOR
- [ ] **Test**: As User A, create address and note `addressId`. As User B, call update or delete with that `addressId`, or use it in checkout. Expect 403/404.
- [ ] **Code review**: In address and checkout APIs, confirm every use of `addressId` checks `userId` ownership.
- **Result**: _____

### 5.4 Admin data scope
- [ ] **Test**: As admin, list orders and form requests. Confirm only intended data (single-tenant: all shop data is acceptable; multi-tenant would require filtering).
- **Result**: _____

---

## 6. Infrastructure and headers

### 6.1 HTTPS redirect
- [ ] **Test**: In production, open `http://your-domain.com` (no SSL). Expect redirect to `https://`.
- [ ] **Check**: netlify.toml or hosting config for force HTTPS / redirect.
- **Result**: _____

### 6.2 Security headers
- [ ] **Test**: In production, inspect response headers for a page (e.g. homepage). Check for: `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` (HSTS).
- [ ] **Code review**: Middleware or hosting config sets these headers.
- **Result**: _____

### 6.3 Sensitive data in error responses
- [ ] **Test**: Trigger a 500 (e.g. invalid input that causes server error) in production or with `NODE_ENV=production`. Check response body.
- [ ] **Expected**: No stack trace, no file paths, no internal error details.
- [ ] **Code review**: API routes use `createSafeErrorResponse` or equivalent; `details` only in development.
- **Result**: _____

### 6.4 Secrets and env
- [ ] **Test**: Search repo for hardcoded passwords, API keys, `BETTER_AUTH_SECRET`, `NEON_DATABASE`, `RESEND_API_KEY`, etc. Expect only in `.env*` (gitignored) or `.env.security.example` (placeholders).
- **Result**: _____

---

## 7. Public forms (no auth)

### 7.1 Spam / abuse
- [ ] **Test**: Submit contact form 20+ times in 1 minute from same IP. Check if rate limit or CAPTCHA blocks further submissions.
- [ ] **Expected**: If no rate limit, note as improvement; if implemented, expect 429 or CAPTCHA.
- **Result**: _____

### 7.2 Email header injection
- [ ] **Test**: In contact form, set email to `attacker@evil.com%0ACc:victim@example.com` or put newlines in name. Check received email (To, Cc, body). Confirm “to” is still your configured address; no extra recipients from input.
- [ ] **Code review**: To/from are fixed in code; user input only in body/subject (subject may need validation for newlines).
- **Result**: _____

---

## 8. Quick code-review checklist

Use this for a pass over the codebase without running every manual test.

- [ ] All `client.query()` / `pool.query()` use parameterized queries (`$1`, `$2`, …); no string concatenation for user input.
- [ ] All user-controlled data in HTML (UI and emails) is escaped (`escapeHtml` or equivalent).
- [ ] Contact, inquiry, product-inquiry: max length on name, email, message, subject (and use validation where applicable).
- [ ] Image proxy: path/key validated (no `..`, allowlisted prefix).
- [ ] Design file upload: type, size, and content (magic-byte) validated.
- [ ] Cart, order, address APIs: every operation scoped by `userId` from session/locals.
- [ ] Admin APIs: every route checks `user?.isAdmin` (or session equivalent).
- [ ] Payment: prices from DB/session only; PayPal session has `userId` and expiry; rate limiting on create + capture.
- [ ] Block-auth: rate limiting and timing-safe password comparison (if applicable).
- [ ] Production error responses: no stack traces or internal paths; use error-handler lib where possible.

---

## Summary

| Category              | Tests | Passed | Failed | Not run |
|-----------------------|-------|--------|--------|---------|
| Auth & session        | 4     |        |        |         |
| Input & injection     | 5     |        |        |         |
| File & path           | 3     |        |        |         |
| Payment               | 3     |        |        |         |
| Authorization / IDOR  | 4     |        |        |         |
| Infrastructure        | 4     |        |        |         |
| Public forms          | 2     |        |        |         |

**Date executed**: _______________  
**Tested by**: _______________  
**Environment**: _______________ (e.g. staging, production)

**Findings log** (brief):  
_________________________________________________________________  
_________________________________________________________________  
_________________________________________________________________
