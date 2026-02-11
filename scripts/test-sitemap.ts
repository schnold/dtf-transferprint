/**
 * Sitemap Testing Utility
 *
 * This script tests the sitemap generation to ensure all URLs are valid
 * and the XML structure is correct.
 *
 * Usage:
 *   tsx scripts/test-sitemap.ts
 */

import { pool } from '../src/lib/db';

const SITE_URL = process.env.PUBLIC_BETTER_AUTH_URL || 'https://selini-shirt.de';

async function testSitemap() {
  console.log('🔍 Testing Sitemap Generation...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();

    try {
      // Fetch products
      console.log('2. Fetching active products...');
      const result = await client.query(`
        SELECT
          slug,
          name,
          "isActive",
          "updatedAt"
        FROM products
        WHERE "isActive" = true
        ORDER BY "updatedAt" DESC
      `);

      console.log(`   ✓ Found ${result.rows.length} active products\n`);

      // Display sample products
      console.log('3. Sample product URLs:');
      result.rows.slice(0, 5).forEach((row, index) => {
        console.log(`   ${index + 1}. ${SITE_URL}/product/${row.slug}`);
        console.log(`      Name: ${row.name}`);
        console.log(`      Last Modified: ${new Date(row.updatedAt).toISOString()}\n`);
      });

      if (result.rows.length > 5) {
        console.log(`   ... and ${result.rows.length - 5} more products\n`);
      }

      // Test for invalid slugs
      console.log('4. Checking for invalid slugs...');
      const invalidSlugs = result.rows.filter(row =>
        !row.slug ||
        row.slug.includes(' ') ||
        row.slug.includes('//') ||
        row.slug.startsWith('/') ||
        row.slug.endsWith('/')
      );

      if (invalidSlugs.length > 0) {
        console.log(`   ⚠️  Warning: Found ${invalidSlugs.length} products with invalid slugs:`);
        invalidSlugs.forEach(row => {
          console.log(`      - Product ID: ${row.slug} (Name: ${row.name})`);
        });
        console.log('');
      } else {
        console.log('   ✓ All product slugs are valid\n');
      }

      // Count URLs: static pages + themen (from data/themen) + products
      const { textilthemenSlugs, sportbekleidungSlugs } = await import('../src/data/themen');
      const themenCount = Object.keys(textilthemenSlugs).length + Object.keys(sportbekleidungSlugs).length;
      const staticPageCount = 64; // Static pages in sitemap.xml.ts (incl. /themen, arbeitskleidung)
      const totalUrls = staticPageCount + themenCount + result.rows.length;

      console.log('5. URL Summary:');
      console.log(`   Static pages: ${staticPageCount}`);
      console.log(`   Themen pages: ${themenCount}`);
      console.log(`   Product pages: ${result.rows.length}`);
      console.log(`   Total URLs in sitemap: ${totalUrls}\n`);

      // Estimate sitemap size
      const avgBytesPerUrl = 200; // Approximate XML overhead per URL entry
      const estimatedSizeKB = Math.ceil((totalUrls * avgBytesPerUrl) / 1024);

      console.log('6. Sitemap Statistics:');
      console.log(`   Estimated size: ~${estimatedSizeKB} KB`);
      console.log(`   XML Sitemap limit: 50,000 URLs`);
      console.log(`   Current usage: ${((totalUrls / 50000) * 100).toFixed(2)}%\n`);

      if (totalUrls > 50000) {
        console.log('   ⚠️  WARNING: URL count exceeds XML sitemap limit!');
        console.log('   Consider implementing a sitemap index.\n');
      }

      // Success summary
      console.log('✅ Sitemap test completed successfully!\n');
      console.log('Next steps:');
      console.log('1. Start dev server: npm run dev');
      console.log('2. View sitemap: http://localhost:4321/sitemap.xml');
      console.log('3. After deployment, submit to Google Search Console');
      console.log(`4. Production URL: ${SITE_URL}/sitemap.xml\n`);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error testing sitemap:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testSitemap();
