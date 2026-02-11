# Cookie Consent System - GDPR/TTDSG Compliant

## Overview

This project implements a **state-of-the-art cookie consent system** fully compliant with German TTDSG (Telekommunikation-Telemedien-Datenschutz-Gesetz) and EU GDPR regulations.

## Features

### ✅ Legal Compliance
- **GDPR Article 6(1)(a)** - Explicit consent for non-essential cookies
- **TTDSG § 25** - German telecommunications data protection law compliance
- **Opt-in by default** - Only necessary cookies are enabled without consent
- **Granular control** - Users can choose specific cookie categories
- **Consent versioning** - Tracks which version of the policy user consented to
- **Audit trail** - All consent decisions are logged (even for guest users)

### 🎨 Design
- **Navbar-matching styling** - Glassmorphism effect matching the site's navbar
- **Responsive design** - Works perfectly on mobile, tablet, and desktop
- **Smooth animations** - Professional slide-up animation and transitions
- **Accessibility** - Keyboard navigation and screen reader friendly
- **Always accessible** - Settings button always visible after initial consent

### 🔒 Privacy Features
- **Local-first storage** - Consent stored in browser cookies
- **Server-side tracking** - Optional server-side consent logging
- **Anonymous guest tracking** - Session-based tracking for non-logged-in users
- **IP anonymization** - Google Analytics configured with anonymize_ip
- **Consent mode** - Google Analytics Consent Mode V2 implementation

### 🛠️ Technical Implementation

#### Database Schema

**User Table (for logged-in users):**
```sql
ALTER TABLE "user" ADD COLUMN "cookieConsent" jsonb;
ALTER TABLE "user" ADD COLUMN "cookieConsentDate" timestamp;
ALTER TABLE "user" ADD COLUMN "cookieConsentVersion" text;
```

**Cookie Consents Table (for guests):**
```sql
CREATE TABLE "cookieConsents" (
    id uuid PRIMARY KEY,
    "sessionId" text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "consentData" jsonb NOT NULL,
    "consentVersion" text NOT NULL,
    "createdAt" timestamp NOT NULL,
    "updatedAt" timestamp NOT NULL
);
```

#### Cookie Categories

1. **Necessary Cookies** (Always Active)
   - Cookie consent settings
   - Session management
   - Shopping cart data
   - Authentication tokens

2. **Analytics Cookies** (Optional)
   - Google Analytics (GA4)
   - Tracking ID: G-XMK40GQN4W
   - IP anonymization enabled
   - Consent Mode V2 implemented

3. **Marketing Cookies** (Not Used - Prepared for future)
   - Advertising cookies
   - Retargeting pixels
   - Social media tracking

4. **Preference Cookies** (Not Used - Prepared for future)
   - UI preferences
   - Language settings
   - Theme preferences

## Files Structure

```
src/
├── components/
│   └── CookieBanner.astro          # Main cookie banner component
├── layouts/
│   └── Layout.astro                # Includes cookie banner
├── pages/
│   ├── api/
│   │   └── cookie-consent/
│   │       └── save.ts             # API endpoint for saving consent
│   └── rechtliches/
│       └── cookies.astro           # Cookie policy page
└── better-auth_migrations/
    └── 2026-01-20T17-00-00.000Z_add_cookie_preferences.sql
```

## Usage

### User Flow

1. **First Visit**
   - Banner appears at bottom of page
   - User sees compact view with 3 options:
     - "Alle akzeptieren" (Accept All)
     - "Nur notwendige" (Only Necessary)
     - "Anpassen" (Customize)

2. **Customization**
   - User clicks "Anpassen"
   - Detailed view shows all cookie categories
   - User can enable/disable individual categories
   - Technical details available in expandable sections

3. **After Consent**
   - Banner disappears
   - Settings icon appears bottom-right
   - User can change preferences anytime

### Developer Integration

**Adding new analytics services:**

```typescript
// In CookieBanner.astro script
function applyConsent(consent: CookieConsent) {
  if (consent.analytics) {
    enableGoogleAnalytics();
    // Add your new service here
    enableYourService();
  }
}
```

**Checking consent in your code:**

```typescript
// Get current consent
const consent = getConsentFromCookie();

if (consent?.analytics) {
  // Load analytics script
}
```

**Listening to consent changes:**

```javascript
window.addEventListener('cookieConsentChanged', (event) => {
  const consent = event.detail;
  console.log('Consent changed:', consent);
});
```

## Google Analytics Integration

### Consent Mode V2

The system implements Google's Consent Mode V2:

```javascript
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  wait_for_update: 500,
});

// When user accepts analytics
gtag('consent', 'update', {
  analytics_storage: 'granted',
});
```

### Configuration

```javascript
gtag('config', 'G-XMK40GQN4W', {
  anonymize_ip: true,              // GDPR compliance
  cookie_flags: 'SameSite=Strict;Secure',
});
```

### Opt-out

```javascript
window['ga-disable-G-XMK40GQN4W'] = true;
```

## API Endpoints

### POST `/api/cookie-consent/save`

Saves cookie consent preferences.

**Request Body:**
```json
{
  "consent": {
    "necessary": true,
    "analytics": false,
    "marketing": false,
    "preferences": false
  },
  "version": "1.0",
  "userId": "uuid-or-null"
}
```

**Response:**
```json
{
  "success": true
}
```

## Legal Documents

### Cookie Policy
- Path: `/rechtliches/cookies`
- Comprehensive explanation of all cookies
- Technical details for each service
- Links to third-party privacy policies
- GDPR/TTDSG compliance information

### Privacy Policy
- Path: `/rechtliches/datenschutz`
- Should reference cookie policy
- Explains data processing

## Compliance Checklist

- ✅ Opt-in by default (no cookies without consent)
- ✅ Granular consent options
- ✅ Easy to understand language (German)
- ✅ Prominent placement (bottom center, hard to miss)
- ✅ Easy to withdraw consent (settings button)
- ✅ Consent versioning
- ✅ Audit trail (database logging)
- ✅ Cookie policy page
- ✅ Technical details available
- ✅ IP anonymization for analytics
- ✅ SameSite and Secure flags
- ✅ No pre-ticked boxes
- ✅ "Reject" option as prominent as "Accept"

## Testing

### Manual Testing

1. **First Visit:**
   ```bash
   # Clear cookies and localStorage
   # Visit site
   # Verify banner appears
   # Verify Google Analytics NOT loaded
   ```

2. **Accept All:**
   ```bash
   # Click "Alle akzeptieren"
   # Verify banner disappears
   # Verify Google Analytics loads
   # Verify cookie is set
   ```

3. **Reject Non-Essential:**
   ```bash
   # Clear cookies
   # Visit site
   # Click "Nur notwendige"
   # Verify only necessary cookies are set
   # Verify Google Analytics NOT loaded
   ```

4. **Customize:**
   ```bash
   # Clear cookies
   # Visit site
   # Click "Anpassen"
   # Verify detailed view opens
   # Toggle analytics checkbox
   # Save preferences
   # Verify correct cookies are loaded
   ```

5. **Change Preferences:**
   ```bash
   # After accepting
   # Click settings button (bottom-right)
   # Change preferences
   # Verify changes applied immediately
   ```

### Browser Console Testing

```javascript
// Check if consent is saved
document.cookie.split(';').find(c => c.includes('dtf_cookie_consent'));

// Check Google Analytics
console.log(window.dataLayer);
console.log(window.gtag);

// Trigger consent change event
window.addEventListener('cookieConsentChanged', (e) => {
  console.log('Consent:', e.detail);
});
```

## Migration

Run the migration to add cookie consent tables:

```bash
npm run db:migrate
```

Or manually:

```bash
psql -d your_database -f better-auth_migrations/2026-01-20T17-00-00.000Z_add_cookie_preferences.sql
```

## Future Enhancements

### Planned Features
- [ ] Marketing cookies integration (Facebook Pixel, etc.)
- [ ] Preference cookies (theme, language)
- [ ] Cookie consent history in user account
- [ ] Admin panel for viewing consent statistics
- [ ] A/B testing for consent rates
- [ ] Multi-language support

### Potential Services
- Facebook Pixel (Marketing)
- LinkedIn Insight Tag (Marketing)
- Hotjar (Analytics)
- Custom preference cookies (UI settings)

## Support

For questions or issues:
- Check the cookie policy: `/rechtliches/cookies`
- Check the privacy policy: `/rechtliches/datenschutz`
- Contact: datenschutz@selini-shirt.de

## References

- [GDPR Official Text](https://gdpr-info.eu/)
- [German TTDSG](https://www.gesetze-im-internet.de/ttdsg/)
- [Google Consent Mode V2](https://support.google.com/analytics/answer/9976101)
- [EU-US Data Privacy Framework](https://www.dataprivacyframework.gov/)

---

**Last Updated:** January 20, 2026  
**Version:** 1.0  
**Compliance:** GDPR, TTDSG, ePrivacy Directive
