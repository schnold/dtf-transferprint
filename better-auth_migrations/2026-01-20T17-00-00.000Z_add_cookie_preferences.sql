-- Add cookie consent preferences to user table
-- Implements GDPR/TTDSG compliant cookie tracking

-- For logged-in users, store preferences in user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cookieConsent" jsonb DEFAULT '{"necessary": true, "analytics": false, "marketing": false, "preferences": false}'::jsonb;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cookieConsentDate" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cookieConsentVersion" text DEFAULT '1.0';

COMMENT ON COLUMN "user"."cookieConsent" IS 'User cookie consent preferences (GDPR/TTDSG compliant)';
COMMENT ON COLUMN "user"."cookieConsentDate" IS 'Date when user last updated cookie preferences';
COMMENT ON COLUMN "user"."cookieConsentVersion" IS 'Version of cookie policy user consented to';

-- Create table for guest (non-logged in) cookie consents
-- This is for compliance tracking even for non-registered users
CREATE TABLE IF NOT EXISTS "cookieConsents" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId" text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "consentData" jsonb NOT NULL DEFAULT '{"necessary": true, "analytics": false, "marketing": false, "preferences": false}'::jsonb,
    "consentVersion" text NOT NULL DEFAULT '1.0',
    "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cookie_consents_session ON "cookieConsents"("sessionId");
CREATE INDEX IF NOT EXISTS idx_cookie_consents_created ON "cookieConsents"("createdAt");

COMMENT ON TABLE "cookieConsents" IS 'Cookie consent tracking for guest users (GDPR/TTDSG compliance)';
