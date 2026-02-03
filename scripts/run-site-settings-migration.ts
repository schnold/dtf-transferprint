import { pool } from '../src/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runSiteSettingsMigration() {
  const client = await pool.connect();
  try {
    console.log('Running site_settings migration...');
    const sql = readFileSync(
      join(process.cwd(), 'migrations', 'create-site-settings.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('Done. Table site_settings created with default banner settings.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSiteSettingsMigration();
