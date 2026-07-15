/**
 * Generic migration runner.
 * Usage: tsx src/db/run-migration.ts <filename>
 * Example: tsx src/db/run-migration.ts 003_roadmap_questions.sql
 */
import pool from './pool';
import path from 'path';
import fs from 'fs';

async function runMigration() {
  const filename = process.argv[2];

  if (!filename) {
    console.error('❌ Usage: tsx src/db/run-migration.ts <filename>');
    console.error('   Example: tsx src/db/run-migration.ts 003_roadmap_questions.sql');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, 'migrations', filename);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`🗄️  Running migration: ${filename}`);
  try {
    await pool.query(sql);
    console.log(`✅ Migration complete: ${filename}`);
  } catch (err) {
    console.error(`❌ Migration failed: ${filename}`, err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
