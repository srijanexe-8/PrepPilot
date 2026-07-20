import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';
import { sendOTPVerificationEmail } from '../services/email';

const router = Router();

// ─── Email / password validators ────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' }
  );
}

// ─── POST /auth/signup ───────────────────────────────────────────────────────

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  // Validation
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, otp_code, otp_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase().trim(), passwordHash, name?.trim() || null, otpCode, otpExpiresAt]
    );

    const user = result.rows[0];
    
    // Send OTP via SES
    await sendOTPVerificationEmail(user.email, otpCode);

    res.status(201).json({
      verificationRequired: true,
      email: user.email,
    });
  } catch (err: unknown) {
    // Postgres unique_violation error code
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /auth/login ────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash, is_verified FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    
    if (!user.is_verified) {
      res.status(403).json({ error: 'Please verify your email address.', verificationRequired: true });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user.id);
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /auth/verify-otp ───────────────────────────────────────────────────

router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: 'Email and OTP are required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, otp_code, otp_expires_at FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    
    if (user.otp_code !== otp) {
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      res.status(401).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    // Mark as verified
    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    const token = signToken(user.id);
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /auth/resend-otp ───────────────────────────────────────────────────

router.post('/resend-otp', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const result = await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3 RETURNING email',
      [otpCode, otpExpiresAt, email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await sendOTPVerificationEmail(result.rows[0].email, otpCode);

    res.status(200).json({ message: 'Verification code resent' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
