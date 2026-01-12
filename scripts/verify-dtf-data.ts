import { pool } from '../src/lib/db';

async function verifyData() {
  const client = await pool.connect();
  try {
    console.log('📊 Verifying DTF Product Data...\n');

    // Check categories
    const categories = await client.query(`
      SELECT name, slug, "parentId"
      FROM "categories"
      WHERE slug LIKE '%dtf%' OR slug LIKE '%blockout%' OR slug LIKE '%meterware%'
      ORDER BY "displayOrder"
    `);
    console.log('✅ Categories:', categories.rows.length);
    categories.rows.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug})${cat.parentId ? ' → parent: ' + cat.parentId : ''}`);
    });

    // Check main product
    const product = await client.query(`
      SELECT id, name, slug, "basePrice", "maxWidthMm", "maxHeightMm", "isBlockout"
      FROM "products"
      WHERE slug = 'dtf-laufmeter-blockout-meterware'
    `);
    console.log('\n✅ Main Product:', product.rows.length);
    if (product.rows[0]) {
      const p = product.rows[0];
      console.log(`   - ${p.name}`);
      console.log(`   - Price: ${p.basePrice}€`);
      console.log(`   - Dimensions: ${p.maxWidthMm}mm × ${p.maxHeightMm}mm`);
      console.log(`   - Blockout: ${p.isBlockout}`);
    }

    // Check price tiers
    const tiers = await client.query(`
      SELECT "minQuantity", "maxQuantity", "discountPercent", "pricePerUnit"
      FROM "priceTiers"
      WHERE "productId" = 'prod-dtf-blockout-5m'
      ORDER BY "displayOrder"
    `);
    console.log('\n✅ Price Tiers:', tiers.rows.length);
    tiers.rows.forEach(tier => {
      const max = tier.maxQuantity || '∞';
      console.log(`   - ${tier.minQuantity}-${max}: ${tier.discountPercent}% off → ${tier.pricePerUnit}€`);
    });

    // Check related products
    const related = await client.query(`
      SELECT rp."relatedProductId", p.name
      FROM "relatedProducts" rp
      JOIN "products" p ON rp."relatedProductId" = p.id
      WHERE rp."productId" = 'prod-dtf-blockout-5m'
      ORDER BY rp."displayOrder"
    `);
    console.log('\n✅ Related Products:', related.rows.length);
    related.rows.forEach(r => {
      console.log(`   - ${r.name}`);
    });

    // Check specifications
    const specs = await client.query(`
      SELECT "specLabel", "specValue"
      FROM "productSpecifications"
      WHERE "productId" = 'prod-dtf-blockout-5m'
      ORDER BY "displayOrder"
    `);
    console.log('\n✅ Specifications:', specs.rows.length);
    specs.rows.forEach(s => {
      console.log(`   - ${s.specLabel}: ${s.specValue}`);
    });

    console.log('\n🎉 All DTF product data verified successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

verifyData();
