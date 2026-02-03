-- ============================================
-- Banner Settings Table
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- Insert default banner settings
INSERT INTO site_settings (setting_key, setting_value) VALUES
    ('banner_enabled', 'true'),
    ('banner_text', '20% auf Stickerei bis 28.02.')
ON CONFLICT (setting_key) DO NOTHING;
