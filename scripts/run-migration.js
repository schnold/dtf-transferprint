import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running shipping profiles migration...');

    const migrationPath = join(__dirname, '../database/migrations/create_shipping_profiles.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('📦 Created tables:');
    console.log('   - shippingProfiles');
    console.log('   - userCartShipping');
    console.log('🎉 Inserted 3 default shipping profiles');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
