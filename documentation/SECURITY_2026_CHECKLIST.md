# Security Checklist 2026 (Online Shop)

Use this checklist for recurring security reviews.  
Legend: `[x]` done, `[ ]` pending, `N/A` not applicable.

Standards baseline (2026):
- OWASP ASVS (v4.x)
- OWASP API Security Top 10 (2023 baseline, still active in 2026 operations)
- PCI DSS 4.0 (payment controls)
- NIST SSDF SP 800-218 (secure development lifecycle)

## 1. Identity, Authentication, Authorization
- [x] Admin routes enforce auth and role checks server-side only.
- [x] Admin role is re-validated against DB (not only client/session claims).
- [x] Sessions use secure cookie attributes in production (`HttpOnly`, `Secure`, `SameSite`).
- [x] Password policy enforces strong length/complexity.
- [ ] MFA for admin accounts.
- [ ] Automated account lockout + alerting after repeated failed admin logins.

## 2. API and Session Security
- [x] Mutating API methods (`POST`, `PUT`, `PATCH`, `DELETE`) enforce same-origin checks to reduce CSRF risk.
- [x] Sensitive endpoints use rate limiting (auth, forms, payment).
- [x] Payment session ownership is bound to authenticated user.
- [x] Payment sessions expire and enforce idempotency on capture.
- [ ] Global API abuse detection (per-IP + per-account with persistent store, not only memory).

## 3. Input, Injection, and Output Encoding
- [x] SQL access uses parameterized queries.
- [x] User-provided HTML/email content is escaped before rendering.
- [x] Input validation and length limits exist for public forms.
- [x] Tracking URLs are allowlisted to trusted carrier domains.
- [ ] Structured schema validation applied consistently on all API payloads.

## 4. File Upload and Storage
- [x] File types and size limits validated for uploads.
- [x] File paths are sanitized and path traversal is blocked in image proxy routes.
- [x] Temporary uploads have cleanup workflow.
- [ ] Content-based file signature validation (magic bytes) enforced on all upload paths.
- [ ] Antivirus/malware scan step before permanent storage.

## 5. Infrastructure, Transport, Browser Protections
- [x] Security headers are set (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- [x] Minimal CSP is set to reduce framing/object injection risk.
- [x] HSTS is set on HTTPS responses.
- [ ] Explicit HTTPS redirect is configured at every deployment target.
- [ ] Add `Cross-Origin-Resource-Policy` and `Cross-Origin-Opener-Policy` after compatibility validation.

## 6. Secrets, Crypto, and Environment
- [x] Auth secret is required in production.
- [x] No hardcoded secrets in source code paths reviewed.
- [x] Production cron endpoint fails closed if secret is missing.
- [ ] Secret rotation policy documented and automated.
- [ ] KMS/Vault-backed secret management verified in deployment.

## 7. Monitoring, Logging, and Incident Response
- [x] Security-sensitive events are logged (admin access checks, blocked access).
- [ ] Centralized log sink with tamper-evident retention.
- [ ] Alerts for suspicious patterns (admin brute-force, payment anomalies, repeated 403/429 spikes).
- [ ] Incident runbook with RTO/RPO and customer notification workflow.

## 8. Supply Chain and Build Security
- [x] Known build error source `lucide-astro` import mismatch not present in current source (uses `@lucide/astro`).
- [ ] CI dependency vulnerability scan (`npm audit`/SCA) with fail thresholds.
- [ ] SBOM generation and artifact signing/attestation (SLSA-aligned).
- [ ] Branch protection + required security checks before merge.

## 9. Privacy and Compliance (Shop + Contact Data)
- [x] Cookie consent persistence exists for logged-in and guest users.
- [x] Guest consent identifiers are pseudonymized (HMAC-based session ID; no raw user-agent stored).
- [x] Guest IP is anonymized before persistence.
- [ ] Data retention/deletion schedules automated for PII tables.
- [ ] DPIA/records of processing updates for new tracking/marketing tooling.

## 10. Personal Data Handling (Deep Check)
- [x] Personal data collection points are mapped (auth, addresses, inquiries, orders, cookie consent).
- [x] Access control gates are enforced for user-owned data (orders, addresses, cart, checkout session linkage).
- [x] Public form PII fields (name/email/phone/message) are validated and escaped before HTML rendering.
- [x] Error responses avoid exposing stack traces/details in production paths.
- [ ] PII retention windows are defined per dataset (`form_requests`, `cookieConsents`, logs, temp uploads).
- [ ] Data subject request workflow (export/delete/correction) is fully documented and tested.
- [ ] Backup retention and encrypted-at-rest guarantees are documented for DB/object storage.

## 11. Payments and Transaction Integrity (Deep Check)
- [x] Checkout totals are server-calculated from DB/cart state (not client-provided prices).
- [x] PayPal order session is bound to authenticated `userId` and expires.
- [x] Capture flow is idempotent for already-captured orders.
- [x] Capture response is validated for status, currency, and amount match before order finalization.
- [x] Payment endpoints are rate-limited.
- [ ] Webhook-based reconciliation/job for payment-provider vs internal order state is implemented.
- [ ] Separate fraud/risk checks (velocity, mismatch signals, high-risk patterns) are documented.

## 12. Regression Validation After Security Changes
- [ ] Run full `npm run build` in CI and production-like environment.
- [ ] Run critical user flows: login, add-to-cart, checkout, order confirmation, admin product/order edits.
- [ ] Re-run API smoke tests for auth, cart, checkout, upload, and admin endpoints.

## Change Log (This Audit)
- [x] Added global security headers and minimal CSP/HSTS handling in middleware.
- [x] Added same-origin enforcement for mutating API endpoints in middleware.
- [x] Hardened cron endpoint to require `CRON_SECRET` in production.
- [x] Fixed admin authorization checks using `locals.user` consistently (`products/create`, `products/[id]/specifications`, `test-r2`, `users/update-discount`).
- [x] Added PayPal capture integrity checks (status/currency/amount verification).
- [x] Pseudonymized guest consent identifiers and anonymized stored IP/user-agent data.
