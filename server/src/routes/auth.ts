import { Router } from 'express';
import express from 'express';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard';
import AuthService from '../services/AuthService.js';
import { cfg } from '../config.js';

const router = Router();
const authService = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: cfg.NODE_ENV === 'production',
  sameSite: (cfg.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  path: '/',
};

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

router.post('/login', express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req.ip, req.get('User-Agent'));

    res.cookie('access_token', result.token, {
      ...COOKIE_OPTIONS,
      maxAge: result.expiresIn * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ user: result.user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/register', express.json(), async (req, res) => {
  try {
    const result = await authService.register(req.body);

    res.cookie('access_token', result.token, {
      ...COOKIE_OPTIONS,
      maxAge: result.expiresIn * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ user: result.user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.sendStatus(200);
});

export default router;
