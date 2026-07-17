import pool from '../src/db/pool';
import { prepareAndSendDay } from '../src/services/scheduler/dailyReminder';

async function resendFailedWhatsAppMessages() {
  console.log('Finding unlocked days that have not been sent yet...');
  
  try {
    const res = await pool.query(
      `SELECT q.id, q.day_number, r.user_id 
       FROM questions q
       JOIN roadmaps r ON q.roadmap_id = r.id
       WHERE q.status IN ('completed', 'today') 
         AND q.sent_at IS NULL
       ORDER BY q.day_number ASC`
    );

    if (res.rows.length === 0) {
      console.log('No failed/unsent messages found.');
      process.exit(0);
    }

    console.log(`Found ${res.rows.length} unsent question(s). Attempting to resend...`);
    
    for (const row of res.rows) {
      await prepareAndSendDay(row.user_id, row.id);
      // Brief pause to avoid hammering the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Resend process complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during resend:', err);
    process.exit(1);
  }
}

resendFailedWhatsAppMessages();
