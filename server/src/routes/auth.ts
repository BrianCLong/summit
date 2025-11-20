import { Router, Request, Response } from 'express';
import express from 'express';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard';
import { authRateLimiter } from '../middleware/security.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import AuthService from '../services/AuthService.js';
import logger from '../utils/logger.js';

const router = Router();
const authService = new AuthService();

// Webhook endpoint (existing)
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

/**
 * POST /api/auth/register
 * Register a new user
 *
 * Body: { email, password, username?, firstName?, lastName?, role? }
 * Returns: { user, token, refreshToken, expiresIn }
 */
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, username, firstName, lastName, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password are required',
      });
    }

    // Password strength validation (min 12 chars, complexity)
    if (password.length < 12) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Password must be at least 12 characters long',
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Validation failed',
        message:
          'Password must contain uppercase, lowercase, number, and special character',
      });
    }

    const result = await authService.register({
      email,
      password,
      username,
      firstName,
      lastName,
      role,
    });

    logger.info('User registered successfully', { userId: result.user.id, email });

    return res.status(201).json(result);
  } catch (error: any) {
    logger.error('Registration failed', { error: error.message });

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Registration failed',
        message: 'User with this email or username already exists',
      });
    }

    return res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 *
 * Body: { email, password }
 * Returns: { user, token, refreshToken, expiresIn }
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password are required',
      });
    }

    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.login(email, password, ipAddress, userAgent);

    logger.info('User logged in successfully', { userId: result.user.id, email, ip: ipAddress });

    return res.status(200).json(result);
  } catch (error: any) {
    logger.warn('Login failed', {
      email: req.body.email,
      ip: req.ip,
      error: error.message,
    });

    // Don't reveal whether email exists or password is wrong
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email or password',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Implements token rotation - old refresh token is invalidated
 *
 * Body: { refreshToken }
 * Returns: { token, refreshToken }
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Refresh token is required',
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired refresh token',
      });
    }

    logger.info('Token refreshed successfully', { ip: req.ip });

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Token refresh failed', { error: error.message, ip: req.ip });

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Token refresh failed',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user - revokes all sessions and blacklists current token
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { message }
 */
router.post('/logout', ensureAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not authenticated',
      });
    }

    await authService.logout(userId, token);

    logger.info('User logged out successfully', { userId, ip: req.ip });

    // Set Clear-Site-Data header to clear browser storage
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    logger.error('Logout failed', { error: error.message, ip: req.ip });

    return res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout',
    });
  }
});

/**
 * POST /api/auth/revoke-token
 * Manually revoke/blacklist a specific token
 * Admin or user can revoke their own tokens
 *
 * Headers: Authorization: Bearer <token>
 * Body: { token } (token to revoke)
 * Returns: { message }
 */
router.post('/revoke-token', ensureAuthenticated, async (req: any, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Token is required',
      });
    }

    const success = await authService.revokeToken(token);

    if (!success) {
      return res.status(500).json({
        error: 'Revocation failed',
        message: 'Failed to revoke token',
      });
    }

    logger.info('Token revoked manually', { userId: req.user?.id, ip: req.ip });

    return res.status(200).json({
      message: 'Token revoked successfully',
    });
  } catch (error: any) {
    logger.error('Token revocation failed', { error: error.message, ip: req.ip });

    return res.status(500).json({
      error: 'Revocation failed',
      message: 'An error occurred during token revocation',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */
router.get('/me', ensureAuthenticated, async (req: any, res: Response) => {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (error: any) {
    logger.error('Failed to get user info', { error: error.message });

    return res.status(500).json({
      error: 'Failed to get user information',
    });
  }
});

export default router;
