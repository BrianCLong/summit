import { Router, Request, Response, RequestHandler } from 'express';
import express from 'express';
import { replayGuard, webhookRatelimit } from '../middleware/webhook-guard.js';
import AuthService from '../services/AuthService.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';

const router = Router();
const authService = new AuthService();

// Type-safe wrapper for async handlers
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>): RequestHandler =>
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await authService.login(email, password, req.ip, req.get('User-Agent'));

  return res.json(result);
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

  const result = await authService.verifyEmail(token);

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

  await authService.resendVerification(email);

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
