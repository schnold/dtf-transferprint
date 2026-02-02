-- ============================================
-- Seed DTF Blockout Product with Price Tiers
-- ============================================

-- Insert/Update categories for DTF products
insert into "categories" ("id", "name", "slug", "description", "parentId", "displayOrder", "isActive")
values
  (
    'cat-dtf-transfer',
    'DTF Transfer',
    'dtf-transfer',
    'Direct-to-Film Transfer Printing Produkte',
    null,
    1,
    true
  ),
  (
    'cat-meterware',
    'Meterware',
    'meterware',
    'DTF Meterware in verschiedenen Längen',
    'cat-dtf-transfer',
    1,
    true
  ),
  (
    'cat-blockout',
    'Blockout',
    'blockout',
    'DTF Blockout Produkte für dunkle Textilien',
    'cat-meterware',
    1,
    true
  ),
  (
    'cat-standardformate',
    'Standardformate',
    'standardformate',
    'DTF Transfer in Standardformaten',
    'cat-dtf-transfer',
    2,
    true
  )
on conflict ("id") do update set
  "name" = excluded."name",
  "slug" = excluded."slug",
  "description" = excluded."description",
  "parentId" = excluded."parentId",
  "displayOrder" = excluded."displayOrder",
  "isActive" = excluded."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Insert main DTF Blockout product
insert into "products" (
  "id",
  "categoryId",
  "slug",
  "name",
  "shortDescription",
  "description",
  "basePrice",
  "sku",
  "trackInventory",
  "inventoryQuantity",
  "inventoryPolicy",
  "requiresShipping",
  "isActive",
  "isFeatured",
  "maxWidthMm",
  "minHeightMm",
  "maxHeightMm",
  "acceptsFileUpload",
  "maxFileSizeMb",
  "allowedFileTypes",
  "priceCalculationMethod",
  "isBlockout",
  "printTechnology",
  "searchKeywords",
  "metaTitle",
  "metaDescription"
)
values (
  'prod-dtf-blockout-5m',
  'cat-blockout',
  'dtf-laufmeter-blockout-meterware',
  'DTF Laufmeter Blockout Meterware',
  'DTF Blockout Meterware bis 5 Meter - Flexible Länge von 1 bis 5 Metern',
  '⚠️ Unbedingt vorher testen! Bei minderwertigen Polyestertextilien kann es zu nachträglichen Farbveränderungen kommen. Bitte führen Sie vor Serienproduktionen eigene Drucktests durch. Für selbstverarbeitete Ware übernehmen wir keine Gewährleistung.

Sie benötigen mehr Platz für Ihre Designs? Mit unserer neuen Blockout DTF-Meterware in flexibler Länge von 1 bis 5 Metern gestalten Sie Ihre Transferfläche exakt nach Ihren Anforderungen – ideal für umfangreiche Projekte, Serienproduktionen oder das Verschachteln vieler kleiner Motive. Die Druckfläche misst konstant 56 cm in der Breite, die Länge bestimmen Sie selbst – bis zu 5.000 mm in einem Stück!

Die Vorteile unserer DTF Blockout Meterware bis 5 Meter Länge:

• Blockout-Technologie für dunkle Textilien: Ihre Motive bleiben kräftig und farbtreu – ganz ohne Durchscheineffekte. Der spezielle Blockout-Materialmix sorgt dafür, dass auch bei tiefschwarzen oder farbintensiven Textilien nichts von unten durchkommt.

• Individuelle Gestaltung auf großer Fläche: Erstellen Sie in Ihrem Grafikprogramm eine Fläche z. B. in 56 × 300 cm oder 56 × 500 cm, platzieren Sie Ihre Motive frei und verschachteln Sie alles so effizient wie möglich – unser System berechnet nur die tatsächlich belegte Fläche. Das heißt: Nur das, was bedruckt wird, wird berechnet.

• Günstige Preise kombiniert mit hoher Druckqualität: Leuchtende Farben, gestochen scharfe Details dank 4c+Weiß-Druck – kombiniert mit der bewährten Strapazierfähigkeit unserer DTF-Transfers. Ideal für Workwear, Merchandise, Events oder Promotion-Aktionen.

• Zentimetergenaue Abrechnung – transparent & fair: Keine Pauschalpreise, keine Verschwendung.

So funktioniert''s:
1. Fläche erstellen: Legen Sie z. B. ein Dokument mit 56 × 500 cm in Ihrem Grafikprogramm an.
2. Motive platzieren: Nutzen Sie die Fläche effizient – gern auch mit Standardmotiven.
3. Exportieren als PDF: Wichtig: keine PNGs, ausschließlich PDF-Uploads möglich.
4. Hochladen & bestellen: Unser System erkennt die bedruckte Fläche automatisch.

Das ideale Produkt für:
• Großaufträge mit vielen Motiven
• Textilveredler mit hohem Durchsatz
• Dunkle und farbige Textilien aller Art
• Kunden, die maximale Effizienz und gestalterische Freiheit suchen',
  14.99,
  'DTF-BLOCKOUT-5M',
  false,
  0,
  'continue',
  true,
  true,
  true,
  560,
  100,
  5000,
  true,
  255,
  'PDF',
  'per_meter',
  true,
  'DTF',
  'DTF Blockout Meterware Transfer Druck Textilien dunkle Stoffe',
  'DTF Laufmeter Blockout Meterware bis 5 Meter | Premium Qualität',
  'Hochwertige DTF Blockout Meterware bis 5 Meter. Perfekt für dunkle Textilien. Flexible Länge, transparente Preise, Mengenrabatte verfügbar.'
)
on conflict ("id") do update set
  "categoryId" = excluded."categoryId",
  "slug" = excluded."slug",
  "name" = excluded."name",
  "shortDescription" = excluded."shortDescription",
  "description" = excluded."description",
  "basePrice" = excluded."basePrice",
  "sku" = excluded."sku",
  "maxWidthMm" = excluded."maxWidthMm",
  "minHeightMm" = excluded."minHeightMm",
  "maxHeightMm" = excluded."maxHeightMm",
  "acceptsFileUpload" = excluded."acceptsFileUpload",
  "maxFileSizeMb" = excluded."maxFileSizeMb",
  "allowedFileTypes" = excluded."allowedFileTypes",
  "priceCalculationMethod" = excluded."priceCalculationMethod",
  "isBlockout" = excluded."isBlockout",
  "printTechnology" = excluded."printTechnology",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Insert price tiers for the product
insert into "priceTiers" ("id", "productId", "minQuantity", "maxQuantity", "discountPercent", "pricePerUnit", "displayOrder")
values
  ('tier-1', 'prod-dtf-blockout-5m', 0, 4, 0, 14.99, 1),
  ('tier-2', 'prod-dtf-blockout-5m', 5, 9, 2, 14.69, 2),
  ('tier-3', 'prod-dtf-blockout-5m', 10, 24, 5, 14.24, 3),
  ('tier-4', 'prod-dtf-blockout-5m', 25, 49, 7, 13.94, 4),
  ('tier-5', 'prod-dtf-blockout-5m', 50, 149, 11, 13.34, 5),
  ('tier-6', 'prod-dtf-blockout-5m', 150, null, 13, 13.04, 6)
on conflict ("id") do update set
  "minQuantity" = excluded."minQuantity",
  "maxQuantity" = excluded."maxQuantity",
  "discountPercent" = excluded."discountPercent",
  "pricePerUnit" = excluded."pricePerUnit",
  "displayOrder" = excluded."displayOrder";

-- Insert related products (we'll add placeholders)
insert into "products" (
  "id",
  "categoryId",
  "slug",
  "name",
  "shortDescription",
  "description",
  "basePrice",
  "sku",
  "trackInventory",
  "inventoryQuantity",
  "requiresShipping",
  "isActive",
  "maxWidthMm",
  "minHeightMm",
  "maxHeightMm",
  "acceptsFileUpload",
  "isBlockout",
  "printTechnology",
  "priceCalculationMethod"
)
values
  (
    'prod-dtf-blockout-a4',
    'cat-blockout',
    'dtf-blockout-a4-format',
    'DTF Blockout A4 Format',
    'Blockout DTF Transfer DIN A4 210 x 297 mm',
    'Hochqualitative DTF Blockout Transfers im praktischen A4-Format. Ideal für kleinere Motive auf dunklen Textilien.',
    3.19,
    'DTF-BLOCKOUT-A4',
    false,
    0,
    true,
    true,
    210,
    297,
    297,
    true,
    true,
    'DTF',
    'per_piece'
  ),
  (
    'prod-dtf-meter-5m',
    'cat-meterware',
    'dtf-transfer-meterware',
    'DTF Transfer Meterware 560 x 1000 mm',
    'DTF Transfer Meterware bis 5 Meter',
    'Standard DTF Transfer Meterware für alle Textilien. Flexible Länge bis 5 Meter.',
    11.09,
    'DTF-METER-5M',
    false,
    0,
    true,
    true,
    560,
    100,
    5000,
    true,
    false,
    'DTF',
    'per_meter'
  ),
  (
    'prod-dtf-a3',
    'cat-standardformate',
    'dtf-a3-format',
    'DTF Transfer DIN A3 297 x 420 mm',
    'DTF Transfer DIN A3 Format',
    'Hochwertiger DTF Transfer im A3-Format. Perfekt für mittelgroße Motive.',
    4.79,
    'DTF-A3',
    false,
    0,
    true,
    true,
    297,
    420,
    420,
    true,
    false,
    'DTF',
    'per_piece'
  )
on conflict ("id") do nothing;

-- Link related products
insert into "relatedProducts" ("id", "productId", "relatedProductId", "displayOrder")
values
  ('rel-1', 'prod-dtf-blockout-5m', 'prod-dtf-blockout-a4', 1),
  ('rel-2', 'prod-dtf-blockout-5m', 'prod-dtf-meter-5m', 2),
  ('rel-3', 'prod-dtf-blockout-5m', 'prod-dtf-a3', 3)
on conflict ("id") do nothing;

-- Add product images (placeholder URLs - replace with actual images)
insert into "productImages" ("id", "productId", "url", "altText", "displayOrder", "isPrimary")
values
  (
    'img-1',
    'prod-dtf-blockout-5m',
    '/images/products/dtf-blockout-meterware.webp',
    'DTF Blockout Meterware Beispiel',
    1,
    true
  )
on conflict ("id") do nothing;

-- Add product specifications
insert into "productSpecifications" ("id", "productId", "specKey", "specLabel", "specValue", "displayOrder")
values
  ('spec-1', 'prod-dtf-blockout-5m', 'width', 'Breite', '560 mm', 1),
  ('spec-2', 'prod-dtf-blockout-5m', 'height_range', 'Höhe', '100 - 5000 mm', 2),
  ('spec-3', 'prod-dtf-blockout-5m', 'file_format', 'Dateiformat', 'PDF', 3),
  ('spec-4', 'prod-dtf-blockout-5m', 'max_file_size', 'Max. Dateigröße', '255 MB', 4),
  ('spec-5', 'prod-dtf-blockout-5m', 'print_method', 'Druckverfahren', '4c + Weiß', 5),
  ('spec-6', 'prod-dtf-blockout-5m', 'material', 'Material', 'DTF Blockout Film', 6)
on conflict ("id") do nothing;
