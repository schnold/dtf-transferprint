-- Insert categories
insert into "categories" (id, name, slug, description, "isActive") values
  ('cat-dtf-transfers', 'DTF-Transfers', 'dtf-transfers', 'Hochwertige DTF-Transfers für Textilien', true),
  ('cat-blockout-dtf', 'Blockout DTF', 'blockout-dtf', 'Premium Blockout DTF für dunkle Textilien', true),
  ('cat-druck-services', 'Druck-Services', 'druck-services', 'Individuelle Druckdienstleistungen', true);

-- Insert product tags
insert into "productTags" (id, name, slug) values
  ('tag-dtf', 'DTF', 'dtf'),
  ('tag-transfer', 'Transfer', 'transfer'),
  ('tag-textile', 'Textil', 'textile'),
  ('tag-basic', 'Basic', 'basic'),
  ('tag-premium', 'Premium', 'premium'),
  ('tag-professional', 'Professional', 'professional'),
  ('tag-custom', 'Custom', 'custom'),
  ('tag-print', 'Print', 'print'),
  ('tag-service', 'Service', 'service'),
  ('tag-individual', 'Individuell', 'individual'),
  ('tag-freesize', 'Freigröße', 'freesize'),
  ('tag-blockout', 'Blockout', 'blockout'),
  ('tag-dark-fabrics', 'Dunkle Stoffe', 'dark-fabrics');

-- Insert products
insert into "products" (id, slug, name, "shortDescription", description, "categoryId", "basePrice", "inventoryQuantity", "isActive", "isFeatured") values
  ('dtf-transfer-basic', 'dtf-transfer-basic', 'DTF Transfer - Basic', 'Hochwertiger DTF-Transfer für Textilien mit lebendigen Farben', 'Unser Standard DTF-Transfer bietet hervorragende Qualität für alle Ihre Textilprojekte. Perfekt für T-Shirts, Hoodies, Taschen und mehr. Die Transferfolie gewährleistet eine langlebige Haftung und brillante Farbwiedergabe.', 'cat-dtf-transfers', 2.50, 100, true, false),
  ('dtf-transfer-premium', 'dtf-transfer-premium', 'DTF Transfer - Premium', 'Premium DTF-Transfer mit erweiterten Eigenschaften für anspruchsvolle Projekte', 'Unser Premium DTF-Transfer bietet die höchste Qualität für professionelle Anwendungen. Mit verbesserter Haftung, erweitertem Farbraum und längerer Haltbarkeit ist dieser Transfer ideal für kommerzielle Projekte und hochwertige Textilien.', 'cat-dtf-transfers', 3.75, 100, true, true),
  ('custom-print-service', 'custom-print-service', 'Individueller Druck-Service', 'Maßgeschneiderte Drucklösungen für Ihre individuellen Designs', 'Unser individueller Druck-Service ermöglicht es Ihnen, Ihre eigenen Designs auf verschiedene Textilien drucken zu lassen. Von kleinen Auflagen bis zu Großbestellungen - wir realisieren Ihre Vision.', 'cat-druck-services', 15.00, 100, true, false),
  ('dtf-transfer-freie-groesse', 'dtf-transfer-freie-groesse', 'DTF Transfer Freigröße', 'Individuell gestaltbare DTF-Transfers in freier Größe - perfekt für einzigartige Designs', 'Unsere DTF-Transfers in Freigröße bieten Ihnen maximale Flexibilität für Ihre kreativen Projekte. Sie bestimmen die Größe und das Design - wir liefern höchste Qualität. Ideal für individuelle Motive, Logos oder künstlerische Designs auf Textilien aller Art. Die professionelle DTF-Technologie garantiert brillante Farben, feine Details und hervorragende Waschbeständigkeit.', 'cat-dtf-transfers', 1.80, 100, true, true),
  ('blockout-dtf-transfer-freie-groesse', 'blockout-dtf-transfer-freie-groesse', 'Blockout DTF Transfer Freigröße', 'Premium Blockout DTF-Transfer in freier Größe - perfekt für dunkle Textilien', 'Unser Blockout DTF-Transfer in Freigröße ist die perfekte Lösung für Drucke auf dunklen und farbigen Textilien. Die spezielle Blockout-Schicht verhindert, dass die Farbe des Untergrunds durchscheint, und sorgt für brillante, deckende Farben auch auf schwarzen Stoffen. Ideal für professionelle Anwendungen, wo höchste Farbdeckung und Qualität gefordert sind. Sie bestimmen die Größe - wir liefern Premium-Qualität mit maximaler Deckkraft.', 'cat-blockout-dtf', 2.20, 100, true, true);

-- Insert product images
insert into "productImages" (id, "productId", url, "altText", "displayOrder", "isPrimary") values
  ('img-1', 'dtf-transfer-basic', '/images/products/dtf-basic-1.jpg', 'DTF Transfer Basic - Hauptansicht', 0, true),
  ('img-2', 'dtf-transfer-basic', '/images/products/dtf-basic-2.jpg', 'DTF Transfer Basic - Detailansicht', 1, false),
  ('img-3', 'dtf-transfer-basic', '/images/products/dtf-basic-3.jpg', 'DTF Transfer Basic - Anwendungsbeispiel', 2, false),
  ('img-4', 'dtf-transfer-premium', '/images/products/dtf-premium-1.jpg', 'DTF Transfer Premium - Hauptansicht', 0, true),
  ('img-5', 'dtf-transfer-premium', '/images/products/dtf-premium-2.jpg', 'DTF Transfer Premium - Detailansicht', 1, false),
  ('img-6', 'custom-print-service', '/images/products/custom-print-1.jpg', 'Custom Print Service - Hauptansicht', 0, true),
  ('img-7', 'custom-print-service', '/images/products/custom-print-2.jpg', 'Custom Print Service - Beispiele', 1, false),
  ('img-8', 'dtf-transfer-freie-groesse', '/images/products/dtf-freesize-1.jpg', 'DTF Transfer Freigröße - Hauptansicht', 0, true),
  ('img-9', 'dtf-transfer-freie-groesse', '/images/products/dtf-freesize-2.jpg', 'DTF Transfer Freigröße - Detailansicht', 1, false),
  ('img-10', 'dtf-transfer-freie-groesse', '/images/products/dtf-freesize-3.jpg', 'DTF Transfer Freigröße - Anwendungsbeispiel', 2, false),
  ('img-11', 'blockout-dtf-transfer-freie-groesse', '/images/products/blockout-freesize-1.jpg', 'Blockout DTF Transfer - Hauptansicht', 0, true),
  ('img-12', 'blockout-dtf-transfer-freie-groesse', '/images/products/blockout-freesize-2.jpg', 'Blockout DTF Transfer - Detailansicht', 1, false),
  ('img-13', 'blockout-dtf-transfer-freie-groesse', '/images/products/blockout-freesize-3.jpg', 'Blockout DTF Transfer - Anwendungsbeispiel', 2, false);

-- Insert product specifications
insert into "productSpecifications" (id, "productId", "specKey", "specLabel", "specValue", "displayOrder") values
  ('spec-1', 'dtf-transfer-basic', 'material', 'Material', 'Premium DTF Film', 0),
  ('spec-2', 'dtf-transfer-basic', 'size', 'Größe', 'A4 (210 x 297 mm)', 1),
  ('spec-3', 'dtf-transfer-basic', 'colors', 'Farben', 'Full Color CMYK', 2),
  ('spec-4', 'dtf-transfer-basic', 'durability', 'Haltbarkeit', 'Waschbar bis 50°C', 3),
  ('spec-5', 'dtf-transfer-basic', 'printArea', 'Druckbereich', 'Max. 200 x 280 mm', 4),
  ('spec-6', 'dtf-transfer-basic', 'application', 'Anwendung', 'Heißpresse bei 160°C', 5),
  ('spec-7', 'dtf-transfer-basic', 'careInstructions', 'Pflegehinweise', '30°C Wäsche, nicht bügeln', 6),
  ('spec-8', 'dtf-transfer-premium', 'material', 'Material', 'Premium DTF Film Pro', 0),
  ('spec-9', 'dtf-transfer-premium', 'size', 'Größe', 'A4 (210 x 297 mm)', 1),
  ('spec-10', 'dtf-transfer-premium', 'colors', 'Farben', 'Extended Color Gamut', 2),
  ('spec-11', 'dtf-transfer-premium', 'durability', 'Haltbarkeit', 'Waschbar bis 60°C', 3),
  ('spec-12', 'dtf-transfer-premium', 'printArea', 'Druckbereich', 'Max. 200 x 280 mm', 4),
  ('spec-13', 'dtf-transfer-premium', 'application', 'Anwendung', 'Heißpresse bei 160-170°C', 5),
  ('spec-14', 'dtf-transfer-premium', 'careInstructions', 'Pflegehinweise', '40°C Wäsche, schonend bügeln möglich', 6),
  ('spec-15', 'custom-print-service', 'material', 'Material', 'Nach Kundenwunsch', 0),
  ('spec-16', 'custom-print-service', 'size', 'Größe', 'Individuell', 1),
  ('spec-17', 'custom-print-service', 'colors', 'Farben', 'Full Color', 2),
  ('spec-18', 'custom-print-service', 'durability', 'Haltbarkeit', 'Je nach Material', 3),
  ('spec-19', 'custom-print-service', 'printArea', 'Druckbereich', 'Nach Design', 4),
  ('spec-20', 'custom-print-service', 'application', 'Anwendung', 'Professionelle Druckanlage', 5),
  ('spec-21', 'dtf-transfer-freie-groesse', 'material', 'Material', 'Premium DTF Film', 0),
  ('spec-22', 'dtf-transfer-freie-groesse', 'size', 'Größe', 'Freie Größe (nach Kundenwunsch)', 1),
  ('spec-23', 'dtf-transfer-freie-groesse', 'colors', 'Farben', 'Full Color CMYK + Weiß', 2),
  ('spec-24', 'dtf-transfer-freie-groesse', 'durability', 'Haltbarkeit', 'Waschbar bis 60°C', 3),
  ('spec-25', 'dtf-transfer-freie-groesse', 'printArea', 'Druckbereich', 'Individuell konfigurierbar', 4),
  ('spec-26', 'dtf-transfer-freie-groesse', 'application', 'Anwendung', 'Heißpresse bei 160-165°C für 10-15 Sekunden', 5),
  ('spec-27', 'dtf-transfer-freie-groesse', 'careInstructions', 'Pflegehinweise', 'Maschinenwäsche bei 40°C, auf links waschen, nicht direkt bügeln', 6),
  ('spec-28', 'blockout-dtf-transfer-freie-groesse', 'material', 'Material', 'Premium Blockout DTF Film', 0),
  ('spec-29', 'blockout-dtf-transfer-freie-groesse', 'size', 'Größe', 'Freie Größe (nach Kundenwunsch)', 1),
  ('spec-30', 'blockout-dtf-transfer-freie-groesse', 'colors', 'Farben', 'Full Color CMYK + Weiß + Blockout-Schicht', 2),
  ('spec-31', 'blockout-dtf-transfer-freie-groesse', 'durability', 'Haltbarkeit', 'Waschbar bis 60°C, besonders abriebfest', 3),
  ('spec-32', 'blockout-dtf-transfer-freie-groesse', 'printArea', 'Druckbereich', 'Individuell konfigurierbar', 4),
  ('spec-33', 'blockout-dtf-transfer-freie-groesse', 'application', 'Anwendung', 'Heißpresse bei 165-170°C für 15 Sekunden', 5),
  ('spec-34', 'blockout-dtf-transfer-freie-groesse', 'careInstructions', 'Pflegehinweise', 'Maschinenwäsche bei 40-60°C, auf links waschen, nicht direkt bügeln', 6);

-- Insert product tag relations
insert into "productTagRelations" ("productId", "tagId") values
  ('dtf-transfer-basic', 'tag-dtf'),
  ('dtf-transfer-basic', 'tag-transfer'),
  ('dtf-transfer-basic', 'tag-textile'),
  ('dtf-transfer-basic', 'tag-basic'),
  ('dtf-transfer-premium', 'tag-dtf'),
  ('dtf-transfer-premium', 'tag-transfer'),
  ('dtf-transfer-premium', 'tag-premium'),
  ('dtf-transfer-premium', 'tag-professional'),
  ('custom-print-service', 'tag-custom'),
  ('custom-print-service', 'tag-print'),
  ('custom-print-service', 'tag-service'),
  ('custom-print-service', 'tag-individual'),
  ('dtf-transfer-freie-groesse', 'tag-dtf'),
  ('dtf-transfer-freie-groesse', 'tag-transfer'),
  ('dtf-transfer-freie-groesse', 'tag-freesize'),
  ('dtf-transfer-freie-groesse', 'tag-custom'),
  ('dtf-transfer-freie-groesse', 'tag-individual'),
  ('blockout-dtf-transfer-freie-groesse', 'tag-dtf'),
  ('blockout-dtf-transfer-freie-groesse', 'tag-blockout'),
  ('blockout-dtf-transfer-freie-groesse', 'tag-freesize'),
  ('blockout-dtf-transfer-freie-groesse', 'tag-dark-fabrics'),
  ('blockout-dtf-transfer-freie-groesse', 'tag-premium');

-- Create a system user for historical reviews (if not exists)
insert into "user" (id, name, email, "emailVerified", "accountLocked", "failedLoginAttempts", "emailNotifications", "isAdmin")
values ('system-user', 'System', 'system@selini-shirt.local', true, false, 0, false, false)
on conflict (email) do nothing;

-- Insert product reviews (linked to system user for historical data)
insert into "productReviews" (id, "productId", "userId", rating, comment, "isVerifiedPurchase", "isApproved", "createdAt") values
  ('review-1', 'dtf-transfer-basic', 'system-user', 5, 'Ausgezeichnete Qualität! Die Farben sind sehr lebendig und der Transfer hält perfekt.', true, true, '2024-01-15T10:00:00Z'),
  ('review-2', 'dtf-transfer-basic', 'system-user', 4, 'Gute Qualität zu einem fairen Preis. Schnelle Lieferung.', true, true, '2024-01-10T14:30:00Z'),
  ('review-3', 'dtf-transfer-premium', 'system-user', 5, 'Absolut zufrieden! Die Premium-Variante ist jeden Cent wert.', true, true, '2024-01-20T16:45:00Z'),
  ('review-4', 'dtf-transfer-freie-groesse', 'system-user', 5, 'Perfekt für meine individuellen Designs! Die Qualität ist ausgezeichnet und die freie Größenwahl ist genial.', true, true, '2024-01-25T11:20:00Z'),
  ('review-5', 'dtf-transfer-freie-groesse', 'system-user', 5, 'Tolle Farbbrillanz und sehr gute Haftung. Genau das, was ich gesucht habe!', true, true, '2024-01-18T09:15:00Z'),
  ('review-6', 'blockout-dtf-transfer-freie-groesse', 'system-user', 5, 'Die Blockout-Qualität ist beeindruckend! Endlich perfekte Drucke auf schwarzen T-Shirts ohne Durchscheinen.', true, true, '2024-01-22T13:30:00Z'),
  ('review-7', 'blockout-dtf-transfer-freie-groesse', 'system-user', 5, 'Absolute Premium-Qualität! Die Farben leuchten auch auf dunklen Stoffen perfekt.', true, true, '2024-01-16T15:45:00Z'),
  ('review-8', 'blockout-dtf-transfer-freie-groesse', 'system-user', 4, 'Sehr gute Deckkraft und Haltbarkeit. Etwas teurer, aber das ist es wert.', true, true, '2024-01-12T10:00:00Z');
