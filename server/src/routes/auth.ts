// @ts-nocheck
import { Router, type Request, type Response, type RequestHandler } from 'express';
import express from 'express';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard.js';
import AuthService from '../services/AuthService.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { recordEndpointResult } from '../observability/reliability-metrics.js';

const router = Router();
const authService = new AuthService();

// Type-safe wrapper for async handlers
const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

/**
 * @route POST /auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', rateLimitMiddleware, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    username
  });

  return res.status(201).json(result);
}));

/**
 * @route POST /auth/login
 * @desc Authenticate user and get tokens
 * @access Public
 */
router.post('/login', rateLimitMiddleware, asyncHandler(async (req, res) => {
  const start = process.hrtime();
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      recordEndpointResult({
        endpoint: 'login',
        statusCode: 400,
        durationSeconds: 0,
        tenantId: 'unknown',
      });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password, req.ip, req.get('User-Agent'));

    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    recordEndpointResult({
      endpoint: 'login',
      statusCode: 200,
      durationSeconds: duration,
      tenantId: result.user?.tenantId,
    });

    return res.json(result);
  } catch (err: any) {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    // Determine status code from error if possible, default to 500
    // Don't treat 4xx errors (client errors) as reliability failures if possible,
    // but the recordEndpointResult logic classifies them.
    // However, for Auth, 401/400 are common and not system errors.

    let statusCode = err.statusCode || 500;

    // Check for common auth errors that might not have statusCode set
    if (err.message === 'Invalid credentials' || err.message === 'User not found') {
        statusCode = 401;
    }

    recordEndpointResult({
      endpoint: 'login',
      statusCode: statusCode,
      durationSeconds: duration,
      tenantId: 'unknown',
    });

    throw err;
  }
}));

/**
 * @route POST /auth/verify-email
 * @desc Verify user email with token
 * @access Public
 */
router.post('/verify-email', rateLimitMiddleware, asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const result = await (authService as any).verifyEmail(token);

  return res.json({
    success: true,
    message: 'Email verified successfully',
    ...result
  });
}));

/**
 * @route POST /auth/resend-verification
 * @desc Resend verification email
 * @access Public
 */
router.post('/resend-verification', rateLimitMiddleware, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  await (authService as any).resendVerification(email);

  return res.json({
    success: true,
    message: 'If an account exists with this email, a verification link has been sent.'
  });
}));

/**
 * @route POST /auth/events
 * @desc Webhook handler for auth events
 * @access Protected (Webhook)
 */
router.post(
  '/events',
  webhookRatelimit,
  replayGuard(),
  express.raw({ type: '*/*', limit: '1mb' }),
  asyncHandler(async (_req, res) => {
    // Generic auth provider webhook stub (Clerk/Auth0/etc.)
    return res.sendStatus(200);
  }),
);

export default router;
