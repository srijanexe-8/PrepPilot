import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await pool.query(`
    UPDATE questions SET sent_at = NULL 
    WHERE roadmap_id IN (
      SELECT r.id FROM roadmaps r JOIN users u ON r.user_id = u.id WHERE u.email = 'pilot@org.com'
    )
  `);
  console.log("Reset sent_at successfully");
  await pool.end();
}

run().catch(console.error);
