import { Router, Response } from 'express';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/roadmap ──────────────────────────────────────────────────────────

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    // Fetch the user's roadmap metadata
    const roadmapRes = await pool.query(
      `SELECT id, user_id, interview_date, created_at
       FROM roadmaps
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (roadmapRes.rows.length === 0) {
      res.status(404).json({ error: 'No roadmap found. Upload your resume and JD to generate one.' });
      return;
    }

    const roadmap = roadmapRes.rows[0];
    const roadmapId = roadmap.id as string;

    // Fetch all questions for this roadmap ordered by day
    const questionsRes = await pool.query(
      `SELECT id, day_number, topic, question_text, learning_goal, difficulty, focus_skill, sent_at
       FROM questions
       WHERE roadmap_id = $1
       ORDER BY day_number ASC`,
      [roadmapId]
    );

    // completed_count: placeholder for future answering flow
    // Will be computed from responses table once that feature is built.
    const completed_count = 0;

    res.json({
      roadmap_id: roadmapId,
      interview_date: roadmap.interview_date,
      created_at: roadmap.created_at,
      completed_count,
      days: questionsRes.rows.map((row) => ({
        id: row.id,
        day_number: row.day_number,
        topic: row.topic,
        question_text: row.question_text,
        learning_goal: row.learning_goal,
        difficulty: row.difficulty,
        focus_skill: row.focus_skill,
        sent_at: row.sent_at,
      })),
    });
  } catch (err) {
    console.error('[roadmap] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

export default router;
