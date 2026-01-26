import { pool } from '../src/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function runProductInquiryMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running product inquiry features migration...\n');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'better-auth_migrations', '2026-01-26T12-00-00.000Z_add_product_inquiry_features.sql');
    const sql = await readFile(migrationPath, 'utf-8');

    console.log('📝 Executing SQL...');
    await client.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('📦 Added columns:');
    console.log('   - products.requiresInquiry');
    console.log('   - form_requests.product_id');
    console.log('   - form_requests.product_name');
    console.log('🎉 Product inquiry feature is now ready!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runProductInquiryMigration().catch(console.error);
