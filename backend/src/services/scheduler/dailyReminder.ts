import pool from '../../db/pool';
import { sendWhatsAppMessage } from '../whatsapp/sender';
import { dailyPracticeSetMessage } from '../whatsapp/templates';
import { createNotification } from '../notifications';
import { generatePracticeContent, PracticeQuestion } from '../practiceContent';

interface UserRow {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string;
}

interface QuestionRow {
  id: string;
  day_number: number;
  topic: string;
  focus_skill: string;
  learning_goal: string;
  resources: any;
  practice_questions: any;
}

/**
 * Eagerly generates practice content (if missing) for an unlocked day
 * and sends the first 2-3 practice questions to the user via WhatsApp.
 * Stamps sent_at = NOW() upon success.
 */
export async function prepareAndSendDay(userId: string, questionId: string): Promise<void> {
  console.log(`[whatsapp-dispatcher] Starting prepareAndSendDay for user ${userId}, question ${questionId}`);
  try {
    const userRes = await pool.query<UserRow>(
      `SELECT id, name, email, whatsapp_number FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];

    // If they don't have WhatsApp connected, just do nothing
    if (!user || !user.whatsapp_number) {
      console.log(`[whatsapp-dispatcher] User ${userId} has no WhatsApp connected. Skipping.`);
      return;
    }
    console.log(`[whatsapp-dispatcher] Found WhatsApp for user ${userId}`);

    const qRes = await pool.query<QuestionRow>(
      `SELECT id, day_number, topic, focus_skill, learning_goal, resources, practice_questions
       FROM questions
       WHERE id = $1 AND sent_at IS NULL`,
      [questionId]
    );

    const q = qRes.rows[0];
    
    // Only proceed if we found it and it hasn't been sent yet
    if (!q) {
      console.log(`[whatsapp-dispatcher] Question ${questionId} not found or already sent (sent_at is not null).`);
      return;
    }
    console.log(`[whatsapp-dispatcher] Found question ${questionId}, checking practice content...`);

    let resources = Array.isArray(q.resources) ? q.resources : [];
    let questions = Array.isArray(q.practice_questions) ? q.practice_questions : [];

    // Eagerly generate practice content if it hasn't been generated yet
    if (resources.length === 0 || questions.length === 0) {
      console.log(`[whatsapp-dispatcher] Eagerly generating practice content for Day ${q.day_number}...`);
      const content = await generatePracticeContent(q.topic, q.focus_skill, q.learning_goal);
      resources = content.resources;
      questions = content.questions;

      // Save to DB so the UI loads instantly when they click "Practice Here"
      await pool.query(
        `UPDATE questions SET resources = $2, practice_questions = $3 WHERE id = $1`,
        [questionId, JSON.stringify(resources), JSON.stringify(questions)]
      );
    }

    const questionsToSend = Array.isArray(questions) ? questions.slice(0, 3) : [];

    // 4. Send the WhatsApp message
    const messageBody = dailyPracticeSetMessage(
      user.name || 'PrepPilot User',
      q.day_number,
      q.topic,
      questionsToSend as PracticeQuestion[]
    );

    // Send the bundled practice questions message
    const success = await sendWhatsAppMessage(user.whatsapp_number, messageBody);

    if (success) {
      // Stamp sent_at
      await pool.query(
        `UPDATE questions SET sent_at = NOW() WHERE id = $1`,
        [questionId]
      );

      // One in-app notification for success
      await createNotification(
        user.id,
        'whatsapp',
        `Day ${q.day_number} practice questions sent to your WhatsApp`,
        q.id
      );

      console.log(`[whatsapp-dispatcher] Sent Day ${q.day_number} practice set to user ${user.id}`);
    } else {
      // In-app notification for failure
      await createNotification(
        user.id,
        'whatsapp',
        `Failed to send Day ${q.day_number} practice questions to your WhatsApp. Your Twilio sandbox may have reached its 50 message daily limit.`,
        q.id
      );
      console.log(`[whatsapp-dispatcher] Failed to send Day ${q.day_number} via WhatsApp for user ${user.id} (Twilio error).`);
    }
  } catch (err) {
    console.error(`[whatsapp-dispatcher] Failed to prepare/send day ${questionId} to user ${userId}:`, err);
  }
}

// Deprecated cron starter (kept as empty so index.ts doesn't break if it imports it)
export function startDailyReminderScheduler(): void {
  console.log('[scheduler] Cron job scheduler disabled (replaced by event-driven unlocks).');
}
