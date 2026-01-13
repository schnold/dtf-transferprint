-- Add icon field to categories table for dynamic icon selection in navbar
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(100);

-- Add some default icons for existing categories
-- Update this after running to set icons for your existing categories
UPDATE categories SET icon = 'box' WHERE name ILIKE '%basic%' OR name ILIKE '%dtf%';
UPDATE categories SET icon = 'layers' WHERE name ILIKE '%blockout%';
UPDATE categories SET icon = 'folder' WHERE icon IS NULL;

-- Add comment to document the icon field
COMMENT ON COLUMN categories.icon IS 'Icon identifier for the category (e.g., box, layers, folder, etc.) - used in navbar mega menu';
