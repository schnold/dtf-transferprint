import { pool } from '../src/lib/db';

async function verifyTables() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying form_requests tables...\n');

    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('form_requests', 'form_request_responses', 'form_request_email_templates')
      ORDER BY table_name
    `);

    console.log('📋 Tables found:');
    tables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

    // Check form_requests columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'form_requests'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 form_requests columns:');
    columns.rows.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check email templates count
    const templates = await client.query('SELECT COUNT(*) as count FROM form_request_email_templates');
    console.log(`\n📧 Email templates: ${templates.rows[0].count}`);

    // Test insert
    console.log('\n🧪 Testing insert...');
    const testResult = await client.query(`
      INSERT INTO form_requests (
        form_type, name, email, subject, message
      ) VALUES (
        'contact', 'Test User', 'test@example.com', 'allgemein', 'Test message'
      ) RETURNING id
    `);
    
    console.log(`   ✓ Successfully inserted test record with id: ${testResult.rows[0].id}`);

    // Clean up test data
    await client.query('DELETE FROM form_requests WHERE email = $1', ['test@example.com']);
    console.log('   ✓ Test record deleted');

    console.log('\n✅ All verifications passed! Database is ready.');
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTables().catch(console.error);
