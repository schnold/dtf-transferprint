import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migration: Adding icon column to categories table...');

    // Step 1: Add the column
    console.log('   Step 1/4: Adding icon column...');
    await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(100)`);
    console.log('   ✓ Column added');

    // Step 2: Update existing categories with default icons
    console.log('   Step 2/4: Setting default icons for existing categories...');
    await client.query(`UPDATE categories SET icon = 'box' WHERE name ILIKE '%basic%' OR name ILIKE '%dtf%'`);
    await client.query(`UPDATE categories SET icon = 'layers' WHERE name ILIKE '%blockout%'`);
    await client.query(`UPDATE categories SET icon = 'folder' WHERE icon IS NULL`);
    console.log('   ✓ Default icons set');

    // Step 3: Add comment
    console.log('   Step 3/4: Adding column comment...');
    try {
      await client.query(`COMMENT ON COLUMN categories.icon IS 'Icon identifier for the category (e.g., box, layers, folder, etc.) - used in navbar mega menu'`);
      console.log('   ✓ Comment added');
    } catch (err) {
      console.log('   ⚠ Comment not added (optional)');
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log('   - Added "icon" column to categories table');
    console.log('   - Set default icons for existing categories');
    console.log('   - You can now select icons in the admin panel');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
