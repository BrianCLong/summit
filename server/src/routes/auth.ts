import { Router, Request } from 'express';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AuthService } from '../services/AuthService.js';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { User } from '../services/AuthService.js';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const router = Router();
const authService = new AuthService();

router.use(cookieParser());
router.use(express.json());

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('Email and password are required');
  }

  try {
    const { user, accessToken, refreshToken } = await authService.login(
      email,
      password,
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh_token',
    });

    res.json({ user, accessToken });
  } catch (error) {
    res.status(401).send('Invalid credentials');
  }
});

router.post('/refresh_token', async (req, res) => {
  const token = req.cookies.refresh_token;

  if (!token) {
    return res.status(401).send('Refresh token not found');
  }

  try {
    const tokenPair = await authService.refreshAccessToken(token);
    if (!tokenPair) {
      return res.status(401).send('Invalid refresh token');
    }

    res.cookie('refresh_token', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh_token',
    });

    return res.json({ accessToken: tokenPair.accessToken });
  } catch (err) {
    return res.status(401).send('Invalid refresh token');
  }
});

router.post(
  '/revoke_all_tokens',
  ensureAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).send('userId is required');
    }

    // A user can only revoke their own tokens, unless they are an admin
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).send('Forbidden');
    }

    try {
      await authService.logout(userId);
      return res.send(`Tokens revoked for user ${userId}`);
    } catch (err) {
      return res.status(500).send('Error revoking tokens');
    }
  },
);

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
