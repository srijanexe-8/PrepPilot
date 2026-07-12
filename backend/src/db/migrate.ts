import pool from './pool';
import path from 'path';
import fs from 'fs';

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('🗄️  Running database migration...');
  try {
    await pool.query(sql);
    console.log('✅ Migration complete — all tables are up to date.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
