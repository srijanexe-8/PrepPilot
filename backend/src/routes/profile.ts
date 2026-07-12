import { Router, Response } from 'express';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /profile/me — protected route
router.get('/me', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, whatsapp_number, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.status(200).json({
      id: user.id,
      email: user.email,
      whatsappNumber: user.whatsapp_number,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
