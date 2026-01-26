import { pool } from '../src/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function runFormRequestsMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running form_requests migration...\n');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '001_form_requests.sql');
    const sql = await readFile(migrationPath, 'utf-8');

    console.log('📝 Executing SQL...');
    await client.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('📦 Created tables:');
    console.log('   - form_requests');
    console.log('   - form_request_responses');
    console.log('   - form_request_email_templates');
    console.log('🎉 Inserted 4 default email templates');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runFormRequestsMigration().catch(console.error);
