-- Migration: Form Request Management System
-- Creates tables for storing and managing contact form submissions

-- ============================================
-- Table: form_requests
-- Stores all form submissions from various sources
-- ============================================
CREATE TABLE form_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Form identification
    form_type VARCHAR(50) NOT NULL DEFAULT 'contact', -- 'contact', 'callback', 'quote', etc.

    -- Submitter information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),

    -- Request details
    subject VARCHAR(100) NOT NULL, -- 'allgemein', 'beratung', 'bestellung', 'support', 'b2b', 'sonstiges'
    message TEXT NOT NULL,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'closed'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

    -- Assignment
    assigned_to_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,

    -- Metadata
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- If submitted by logged-in user
    ip_address VARCHAR(45), -- For spam prevention
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('german', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(message, ''))
    ) STORED
);

-- Indexes for performance
CREATE INDEX idx_form_requests_status ON form_requests(status);
CREATE INDEX idx_form_requests_form_type ON form_requests(form_type);
CREATE INDEX idx_form_requests_created_at ON form_requests(created_at DESC);
CREATE INDEX idx_form_requests_assigned_to ON form_requests(assigned_to_user_id);
CREATE INDEX idx_form_requests_email ON form_requests(email);
CREATE INDEX idx_form_requests_search ON form_requests USING gin(search_vector);

-- Composite index for common filtering
CREATE INDEX idx_form_requests_status_date ON form_requests(status, created_at DESC);

-- ============================================
-- Table: form_request_responses
-- Tracks admin replies and internal notes
-- ============================================
CREATE TABLE form_request_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_request_id UUID NOT NULL REFERENCES form_requests(id) ON DELETE CASCADE,

    -- Response details
    response_type VARCHAR(50) NOT NULL DEFAULT 'email', -- 'email', 'note', 'status_change'
    subject VARCHAR(255),
    message TEXT NOT NULL,

    -- Template used (if any)
    template_name VARCHAR(100),

    -- Sending details
    sent_via VARCHAR(50) DEFAULT 'resend', -- 'resend', 'manual', 'phone'
    sent_to_email VARCHAR(255),
    sent_at TIMESTAMP,
    email_status VARCHAR(50), -- 'sent', 'delivered', 'bounced', 'failed'

    -- Admin tracking
    created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    is_internal_note BOOLEAN DEFAULT false, -- Internal notes not sent to customer

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_responses_request_id ON form_request_responses(form_request_id);
CREATE INDEX idx_form_responses_created_at ON form_request_responses(created_at DESC);

-- ============================================
-- Table: form_request_email_templates
-- Pre-defined email templates for responses
-- ============================================
CREATE TABLE form_request_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template identification
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    -- Template content
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,

    -- Categorization
    category VARCHAR(50), -- 'initial_response', 'follow_up', 'resolution', 'other'

    -- Template variables documentation
    available_variables TEXT, -- JSON array of available placeholders

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE INDEX idx_templates_slug ON form_request_email_templates(slug);
CREATE INDEX idx_templates_category ON form_request_email_templates(category);
CREATE INDEX idx_templates_is_active ON form_request_email_templates(is_active);

-- ============================================
-- Insert default email templates
-- ============================================

-- Template 1: Initial Response
INSERT INTO form_request_email_templates (name, slug, category, subject, html_body, text_body, available_variables, description) VALUES (
    'Erstantwort',
    'initial-response',
    'initial_response',
    'Re: {{requestSubject}} - Vielen Dank für Ihre Anfrage',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">DTF Transfer Print</h1>
            <p style="margin: 10px 0 0 0;">Vielen Dank für Ihre Anfrage</p>
        </div>
        <div class="content">
            <p>Hallo {{userName}},</p>

            <p>vielen Dank für Ihre Anfrage bei DTF Transfer Print. Wir haben Ihre Nachricht erhalten und werden uns so schnell wie möglich bei Ihnen melden.</p>

            <div class="info-box">
                <strong>Ihre Anfrage:</strong><br>
                <strong>Betreff:</strong> {{requestSubject}}<br>
                <strong>Nachricht:</strong><br>
                {{requestMessage}}
            </div>

            <p>In der Zwischenzeit können Sie auch gerne unsere FAQ-Seite besuchen oder sich unser Produktsortiment ansehen.</p>

            <p>Mit freundlichen Grüßen,<br>
            Ihr Team von DTF Transfer Print</p>
        </div>
        <div class="footer">
            <p>DTF Transfer Print | info@selini-shirt.de | +49 123 456789<br>
            Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese Nachricht.</p>
        </div>
    </div>
</body>
</html>',
    'Hallo {{userName}},

vielen Dank für Ihre Anfrage bei DTF Transfer Print. Wir haben Ihre Nachricht erhalten und werden uns so schnell wie möglich bei Ihnen melden.

Ihre Anfrage:
Betreff: {{requestSubject}}
Nachricht: {{requestMessage}}

In der Zwischenzeit können Sie auch gerne unsere FAQ-Seite besuchen oder sich unser Produktsortiment ansehen.

Mit freundlichen Grüßen,
Ihr Team von DTF Transfer Print

---
DTF Transfer Print | info@selini-shirt.de | +49 123 456789
Diese E-Mail wurde automatisch generiert.',
    '["userName", "requestSubject", "requestMessage"]',
    'Automatische Erstantwort auf Kundenanfragen'
);

-- Template 2: Request for Additional Information
INSERT INTO form_request_email_templates (name, slug, category, subject, html_body, text_body, available_variables, description) VALUES (
    'Zusätzliche Informationen benötigt',
    'request-info',
    'follow_up',
    'Re: {{requestSubject}} - Wir benötigen weitere Informationen',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .highlight-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">DTF Transfer Print</h1>
        </div>
        <div class="content">
            <p>Hallo {{userName}},</p>

            <p>vielen Dank für Ihre Anfrage bezüglich "{{requestSubject}}".</p>

            <div class="highlight-box">
                <strong>Um Ihnen optimal helfen zu können, benötigen wir noch folgende Informationen:</strong><br><br>
                {{responseMessage}}
            </div>

            <p>Bitte antworten Sie auf diese E-Mail mit den gewünschten Informationen, damit wir Ihre Anfrage schnellstmöglich bearbeiten können.</p>

            <p>Mit freundlichen Grüßen,<br>
            {{adminName}}<br>
            DTF Transfer Print</p>
        </div>
        <div class="footer">
            <p>DTF Transfer Print | info@selini-shirt.de | +49 123 456789</p>
        </div>
    </div>
</body>
</html>',
    'Hallo {{userName}},

vielen Dank für Ihre Anfrage bezüglich "{{requestSubject}}".

Um Ihnen optimal helfen zu können, benötigen wir noch folgende Informationen:

{{responseMessage}}

Bitte antworten Sie auf diese E-Mail mit den gewünschten Informationen, damit wir Ihre Anfrage schnellstmöglich bearbeiten können.

Mit freundlichen Grüßen,
{{adminName}}
DTF Transfer Print

---
DTF Transfer Print | info@selini-shirt.de | +49 123 456789',
    '["userName", "requestSubject", "responseMessage", "adminName"]',
    'Nachfrage bei Kunden für zusätzliche Details'
);

-- Template 3: Problem Resolved
INSERT INTO form_request_email_templates (name, slug, category, subject, html_body, text_body, available_variables, description) VALUES (
    'Problem gelöst',
    'problem-resolved',
    'resolution',
    'Re: {{requestSubject}} - Ihre Anfrage wurde bearbeitet',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">DTF Transfer Print</h1>
        </div>
        <div class="content">
            <p>Hallo {{userName}},</p>

            <div class="success-box">
                <strong>✓ Ihre Anfrage wurde erfolgreich bearbeitet</strong>
            </div>

            <p>{{responseMessage}}</p>

            <p>Sollten Sie weitere Fragen haben oder zusätzliche Unterstützung benötigen, zögern Sie bitte nicht, sich erneut an uns zu wenden. Wir sind jederzeit für Sie da!</p>

            <p>Vielen Dank für Ihr Vertrauen in DTF Transfer Print.</p>

            <p>Mit freundlichen Grüßen,<br>
            {{adminName}}<br>
            DTF Transfer Print</p>
        </div>
        <div class="footer">
            <p>DTF Transfer Print | info@selini-shirt.de | +49 123 456789</p>
        </div>
    </div>
</body>
</html>',
    'Hallo {{userName}},

Ihre Anfrage wurde erfolgreich bearbeitet.

{{responseMessage}}

Sollten Sie weitere Fragen haben oder zusätzliche Unterstützung benötigen, zögern Sie bitte nicht, sich erneut an uns zu wenden. Wir sind jederzeit für Sie da!

Vielen Dank für Ihr Vertrauen in DTF Transfer Print.

Mit freundlichen Grüßen,
{{adminName}}
DTF Transfer Print

---
DTF Transfer Print | info@selini-shirt.de | +49 123 456789',
    '["userName", "responseMessage", "adminName"]',
    'Bestätigung dass das Problem gelöst wurde'
);

-- Template 4: Escalation Notice
INSERT INTO form_request_email_templates (name, slug, category, subject, html_body, text_body, available_variables, description) VALUES (
    'Weiterleitung an Fachabteilung',
    'escalation',
    'other',
    'Re: {{requestSubject}} - Weiterleitung Ihrer Anfrage',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .info-box { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">DTF Transfer Print</h1>
        </div>
        <div class="content">
            <p>Hallo {{userName}},</p>

            <p>vielen Dank für Ihre Anfrage bezüglich "{{requestSubject}}".</p>

            <div class="info-box">
                <strong>ℹ Ihre Anfrage wurde an unsere Fachabteilung weitergeleitet</strong><br><br>
                Um Ihnen die bestmögliche Unterstützung zu bieten, haben wir Ihre Anfrage an unsere Spezialisten weitergeleitet. Diese werden sich in Kürze mit Ihnen in Verbindung setzen.
            </div>

            <p>{{responseMessage}}</p>

            <p>Wir danken Ihnen für Ihre Geduld und melden uns schnellstmöglich bei Ihnen.</p>

            <p>Mit freundlichen Grüßen,<br>
            {{adminName}}<br>
            DTF Transfer Print</p>
        </div>
        <div class="footer">
            <p>DTF Transfer Print | info@selini-shirt.de | +49 123 456789</p>
        </div>
    </div>
</body>
</html>',
    'Hallo {{userName}},

vielen Dank für Ihre Anfrage bezüglich "{{requestSubject}}".

Ihre Anfrage wurde an unsere Fachabteilung weitergeleitet.

Um Ihnen die bestmögliche Unterstützung zu bieten, haben wir Ihre Anfrage an unsere Spezialisten weitergeleitet. Diese werden sich in Kürze mit Ihnen in Verbindung setzen.

{{responseMessage}}

Wir danken Ihnen für Ihre Geduld und melden uns schnellstmöglich bei Ihnen.

Mit freundlichen Grüßen,
{{adminName}}
DTF Transfer Print

---
DTF Transfer Print | info@selini-shirt.de | +49 123 456789',
    '["userName", "requestSubject", "responseMessage", "adminName"]',
    'Benachrichtigung über Weiterleitung an Fachabteilung'
);

-- ============================================
-- Trigger: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_form_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_form_request_timestamp
    BEFORE UPDATE ON form_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_form_request_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE form_requests IS 'Stores all form submissions from various sources (contact, quote requests, etc.)';
COMMENT ON TABLE form_request_responses IS 'Tracks admin responses and internal notes for form requests';
COMMENT ON TABLE form_request_email_templates IS 'Pre-defined email templates for responding to form requests';

COMMENT ON COLUMN form_requests.status IS 'Current status: pending, in_progress, resolved, closed';
COMMENT ON COLUMN form_requests.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN form_requests.search_vector IS 'Full-text search index for name, email, and message';
COMMENT ON COLUMN form_request_responses.is_internal_note IS 'True if this is an internal note that should not be emailed to customer';
