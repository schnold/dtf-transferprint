import { pool } from '../src/lib/db';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration process...\n');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL PRIMARY KEY,
        "filename" TEXT NOT NULL UNIQUE,
        "executedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Migration tracking table ready\n');

    // Read migration files
    const migrationsDir = join(process.cwd(), 'better-auth_migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${sqlFiles.length} migration files:\n`);

    for (const file of sqlFiles) {
      // Check if already executed
      const existing = await client.query(
        'SELECT filename FROM "migrations" WHERE filename = $1',
        [file]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`📝 Running migration: ${file}`);
      const sql = await readFile(join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        // Execute the migration SQL
        await client.query(sql);

        // Record the migration
        await client.query(
          'INSERT INTO "migrations" (filename) VALUES ($1)',
          [file]
        );

        await client.query('COMMIT');
        console.log(`✅ Completed: ${file}\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed: ${file}`);
        console.error('Error:', error);
        throw error;
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration process failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
