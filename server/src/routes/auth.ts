import { Router } from 'express';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { generateAccessToken } from '../lib/auth.js';
import { getPostgresPool } from '../db/postgres.js';
import { z } from 'zod';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard';

const router = Router();
router.use(cookieParser());

// Zod schema for user object
const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().optional(),
  role: z.string().optional(),
});

router.post('/refresh_token', async (req, res) => {
  const token = req.cookies.jid;
  if (!token) {
    return res.status(401).send({ ok: false, accessToken: '' });
  }

  try {
    const REFRESH_TOKEN_SECRET =
      process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret';
    const payload: any = jwt.verify(token, REFRESH_TOKEN_SECRET);

    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [
      payload.userId,
    ]);
    const user = UserSchema.parse(result.rows[0]);

    // In a real app, you'd check a token version/blocklist here

    return res.send({ ok: true, accessToken: generateAccessToken(user) });
  } catch (err) {
    return res.status(401).send({ ok: false, accessToken: '' });
  }
});

router.post(
  '/events',
  webhookRatelimit,
  replayGuard(),
  express.raw({ type: '*/*', limit: '1mb' }),
  async (_req, res) => {
    // Generic auth provider webhook stub (Clerk/Auth0/etc.)
    return res.sendStatus(200);
  },
);

export default router;
