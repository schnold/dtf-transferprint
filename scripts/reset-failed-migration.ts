import { pool } from '../src/lib/db';

async function resetMigration() {
  const client = await pool.connect();
  try {
    await client.query(
      'DELETE FROM "migrations" WHERE filename = $1',
      ['2026-01-11T12-01-00.000Z_seed_dtf_blockout_product.sql']
    );
    console.log('✅ Reset failed migration record');
  } finally {
    client.release();
    await pool.end();
  }
}

resetMigration();
