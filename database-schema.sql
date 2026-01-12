-- ============================================
-- DTF Transfer Print Database Schema
-- ============================================

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_reseller BOOLEAN DEFAULT FALSE,
    reseller_discount_percent DECIMAL(5,2) DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multi-level Categories (hierarchical structure for navbar)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    description TEXT,
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster category hierarchy queries
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT,

    -- Product specifications
    max_width_mm INTEGER NOT NULL,
    min_height_mm INTEGER DEFAULT 1,
    max_height_mm INTEGER NOT NULL,

    -- File upload settings
    accepts_file_upload BOOLEAN DEFAULT TRUE,
    max_file_size_mb INTEGER DEFAULT 255,
    allowed_file_types VARCHAR(100) DEFAULT 'PDF',

    -- Pricing
    base_price_per_unit DECIMAL(10,2) NOT NULL,
    price_calculation_method VARCHAR(50) DEFAULT 'per_piece', -- 'per_piece', 'per_area', 'per_meter'

    -- Product type and features
    is_blockout BOOLEAN DEFAULT FALSE,
    print_technology VARCHAR(50) DEFAULT 'DTF',

    -- Stock and availability
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT FALSE,

    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);

-- Product Images
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- Price Tiers (Quantity-based discounts)
CREATE TABLE price_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER, -- NULL means infinity
    discount_percent DECIMAL(5,2) NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_tiers_product_id ON price_tiers(product_id);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,

    -- Customer info (for guest checkout or historical record)
    customer_email VARCHAR(255) NOT NULL,
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),

    -- Pricing
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, cancelled, refunded
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid, refunded

    -- Shipping info
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),

    -- Billing info
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,

    -- Product snapshot (in case product is deleted/modified later)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),

    -- Custom dimensions
    width_mm INTEGER,
    height_mm INTEGER,

    -- File upload
    uploaded_file_url VARCHAR(500),
    uploaded_file_name VARCHAR(255),

    -- Pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Shopping Cart
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- For guest users
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,

    -- Custom dimensions
    width_mm INTEGER,
    height_mm INTEGER,

    -- File upload (temporary storage)
    uploaded_file_url VARCHAR(500),
    uploaded_file_name VARCHAR(255),

    quantity INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- Related Products (for "Ähnliche Produkte" section)
CREATE TABLE related_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    related_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_related_products_product_id ON related_products(product_id);

-- Product Reviews (optional, for future use)
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(255),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);

-- ============================================
-- Sample Data Insert
-- ============================================

-- Sample Categories (Multi-level hierarchy)
INSERT INTO categories (id, name, slug, parent_id, display_order, is_active) VALUES
    ('cat-1', 'DTF Transfer', 'dtf-transfer', NULL, 1, TRUE),
    ('cat-2', 'Meterware', 'meterware', 'cat-1', 1, TRUE),
    ('cat-3', 'Standardformate', 'standardformate', 'cat-1', 2, TRUE),
    ('cat-4', 'Blockout', 'blockout', 'cat-2', 1, TRUE),
    ('cat-5', 'Standard', 'standard', 'cat-2', 2, TRUE),
    ('cat-6', 'A4 Format', 'a4-format', 'cat-3', 1, TRUE),
    ('cat-7', 'A3 Format', 'a3-format', 'cat-3', 2, TRUE);

-- Sample Product: DTF Laufmeter Blockout Meterware
INSERT INTO products (
    id,
    category_id,
    sku,
    name,
    slug,
    short_description,
    description,
    max_width_mm,
    min_height_mm,
    max_height_mm,
    accepts_file_upload,
    max_file_size_mb,
    allowed_file_types,
    base_price_per_unit,
    price_calculation_method,
    is_blockout,
    is_active,
    track_inventory
) VALUES (
    'prod-1',
    'cat-4',
    'DTF-BLOCKOUT-5M',
    'DTF Laufmeter Blockout Meterware',
    'dtf-laufmeter-blockout-meterware',
    'DTF Blockout Meterware bis 5 Meter - Flexible Länge von 1 bis 5 Metern',
    '⚠️ Unbedingt vorher testen! Bei minderwertigen Polyestertextilien kann es zu nachträglichen Farbveränderungen kommen. Bitte führen Sie vor Serienproduktionen eigene Drucktests durch. Für selbstverarbeitete Ware übernehmen wir keine Gewährleistung.

Sie benötigen mehr Platz für Ihre Designs? Mit unserer neuen Blockout DTF-Meterware in flexibler Länge von 1 bis 5 Metern gestalten Sie Ihre Transferfläche exakt nach Ihren Anforderungen – ideal für umfangreiche Projekte, Serienproduktionen oder das Verschachteln vieler kleiner Motive. Die Druckfläche misst konstant 56 cm in der Breite, die Länge bestimmen Sie selbst – bis zu 5.000 mm in einem Stück!

Die Vorteile unserer DTF Blockout Meterware bis 5 Meter Länge
Blockout-Technologie für dunkle Textilien: Ihre Motive bleiben kräftig und farbtreu – ganz ohne Durchscheineffekte. Der spezielle Blockout-Materialmix sorgt dafür, dass auch bei tiefschwarzen oder farbintensiven Textilien nichts von unten durchkommt.

Individuelle Gestaltung auf großer Fläche: Erstellen Sie in Ihrem Grafikprogramm eine Fläche z. B. in 56 × 300 cm oder 56 × 500 cm, platzieren Sie Ihre Motive frei und verschachteln Sie alles so effizient wie möglich – unser System berechnet nur die tatsächlich belegte Fläche. Das heißt: Nur das, was bedruckt wird, wird berechnet.

Günstige Preise kombiniert mit hoher Druckqualität: Leuchtende Farben, gestochen scharfe Details dank 4c+Weiß-Druck – kombiniert mit der bewährten Strapazierfähigkeit unserer DTF-Transfers. Ideal für Workwear, Merchandise, Events oder Promotion-Aktionen.

Zentimetergenaue Abrechnung – transparent & fair: Keine Pauschalpreise, keine Verschwendung.',
    560,
    100,
    5000,
    TRUE,
    255,
    'PDF',
    14.99,
    'per_meter',
    TRUE,
    TRUE,
    FALSE
);

-- Price Tiers for the product
INSERT INTO price_tiers (product_id, min_quantity, max_quantity, discount_percent, price_per_unit, display_order) VALUES
    ('prod-1', 0, 4, 0, 14.99, 1),
    ('prod-1', 5, 9, 2, 14.69, 2),
    ('prod-1', 10, 24, 5, 14.24, 3),
    ('prod-1', 25, 49, 7, 13.94, 4),
    ('prod-1', 50, 149, 11, 13.34, 5),
    ('prod-1', 150, NULL, 13, 13.04, 6);

-- Sample related products (we'll create them first)
INSERT INTO products (
    id, category_id, sku, name, slug,
    short_description, max_width_mm, min_height_mm, max_height_mm,
    base_price_per_unit, is_blockout, is_active
) VALUES
    ('prod-2', 'cat-4', 'DTF-BLOCKOUT-A4', 'DTF Blockout A4 Format', 'dtf-blockout-a4',
     'Blockout DTF Transfer DIN A4 210 x 297 mm', 210, 297, 297, 3.19, TRUE, TRUE),
    ('prod-3', 'cat-5', 'DTF-METER-5M', 'DTF Transfer Meterware 560 x 1000 mm', 'dtf-transfer-meterware',
     'DTF Transfer Meterware bis 5 Meter', 560, 100, 5000, 11.09, FALSE, TRUE),
    ('prod-4', 'cat-7', 'DTF-A3', 'DTF Transfer DIN A3 297 x 420 mm', 'dtf-a3-format',
     'DTF Transfer DIN A3 Format', 297, 420, 420, 4.79, FALSE, TRUE);

-- Link related products
INSERT INTO related_products (product_id, related_product_id, display_order) VALUES
    ('prod-1', 'prod-2', 1),
    ('prod-1', 'prod-3', 2),
    ('prod-1', 'prod-4', 3);

-- ============================================
-- Useful Views for Frontend
-- ============================================

-- View for category tree with full path
CREATE OR REPLACE VIEW category_tree AS
WITH RECURSIVE category_hierarchy AS (
    SELECT
        id,
        name,
        slug,
        parent_id,
        display_order,
        is_active,
        name::TEXT as full_path,
        0 as level
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.display_order,
        c.is_active,
        ch.full_path || ' > ' || c.name,
        ch.level + 1
    FROM categories c
    INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
)
SELECT * FROM category_hierarchy;

-- View for products with category info
CREATE OR REPLACE VIEW products_with_category AS
SELECT
    p.*,
    c.name as category_name,
    c.slug as category_slug,
    ct.full_path as category_path
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN category_tree ct ON c.id = ct.id;

-- ============================================
-- Functions for Price Calculation
-- ============================================

-- Function to get applicable price tier for a quantity
CREATE OR REPLACE FUNCTION get_price_for_quantity(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS TABLE (
    unit_price DECIMAL(10,2),
    discount_percent DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pt.price_per_unit,
        pt.discount_percent
    FROM price_tiers pt
    WHERE pt.product_id = p_product_id
        AND p_quantity >= pt.min_quantity
        AND (pt.max_quantity IS NULL OR p_quantity <= pt.max_quantity)
    ORDER BY pt.min_quantity DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate line total with reseller discount
CREATE OR REPLACE FUNCTION calculate_line_total(
    p_product_id UUID,
    p_quantity INTEGER,
    p_user_id UUID DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_unit_price DECIMAL(10,2);
    v_reseller_discount DECIMAL(5,2) := 0;
    v_line_total DECIMAL(10,2);
BEGIN
    -- Get unit price for quantity
    SELECT unit_price INTO v_unit_price
    FROM get_price_for_quantity(p_product_id, p_quantity);

    -- Get reseller discount if user is a reseller
    IF p_user_id IS NOT NULL THEN
        SELECT reseller_discount_percent INTO v_reseller_discount
        FROM users
        WHERE id = p_user_id AND is_reseller = TRUE;
    END IF;

    -- Calculate total
    v_line_total := v_unit_price * p_quantity;

    -- Apply reseller discount
    IF v_reseller_discount > 0 THEN
        v_line_total := v_line_total * (1 - v_reseller_discount / 100);
    END IF;

    RETURN ROUND(v_line_total, 2);
END;
$$ LANGUAGE plpgsql;
