/**
 * Authentication Routes
 *
 * Comprehensive REST API for user authentication including:
 * - User registration with validation
 * - Login with JWT token generation
 * - Token refresh with rotation
 * - Logout with session invalidation
 * - Password reset flow
 * - Email verification
 * - Current user profile
 *
 * @module routes/authRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { PasswordResetService } from '../services/PasswordResetService.js';
import { authRateLimiter, loginRateLimiter, registerRateLimiter, passwordResetRateLimiter } from '../middleware/authRateLimit.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { z } from 'zod';
import logger from '../utils/logger.js';

const router = Router();
const authService = new AuthService();
const passwordResetService = new PasswordResetService();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// Validation middleware
function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors = result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        });
      }
      req.body = result.data;
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'INVALID_JSON',
      });
    }
  };
}

/**
 * @route POST /auth/register
 * @desc Register a new user account
 * @access Public
 */
router.post(
  '/register',
  registerRateLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, username, firstName, lastName } = req.body;

      const result = await authService.register({
        email,
        password,
        username: username || email.split('@')[0],
        firstName,
        lastName,
        role: 'VIEWER', // Default role for new registrations
      });

      logger.info({
        message: 'User registered successfully',
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
      });

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          createdAt: result.user.createdAt,
        },
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error: any) {
      logger.error({
        message: 'Registration failed',
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'User with this email or username already exists',
          code: 'USER_EXISTS',
        });
      }

      res.status(500).json({
        error: 'Registration failed',
        code: 'REGISTRATION_FAILED',
      });
    }
  }
);

/**
 * @route POST /auth/login
 * @desc Authenticate user and return JWT tokens
 * @access Public
 */
router.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const result = await authService.login(
        email,
        password,
        req.ip,
        req.get('User-Agent')
      );

      logger.info({
        message: 'User logged in successfully',
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
      });

      res.json({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          fullName: result.user.fullName,
          role: result.user.role,
          lastLogin: result.user.lastLogin,
        },
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error: any) {
      logger.warn({
        message: 'Login failed',
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }
  }
);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public (with valid refresh token)
 */
router.post(
  '/refresh',
  authRateLimiter,
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshAccessToken(refreshToken);

      if (!result) {
        return res.status(401).json({
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      logger.info({
        message: 'Token refreshed successfully',
        ip: req.ip,
      });

      res.json({
        message: 'Token refreshed successfully',
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      logger.error({
        message: 'Token refresh failed',
        error: error.message,
        ip: req.ip,
      });

      res.status(401).json({
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED',
      });
    }
  }
);

/**
 * @route POST /auth/logout
 * @desc Logout user and invalidate tokens
 * @access Private
 */
router.post(
  '/logout',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const token = req.headers.authorization?.replace('Bearer ', '');

      await authService.logout(user.id, token);

      logger.info({
        message: 'User logged out successfully',
        userId: user.id,
        ip: req.ip,
      });

      res.json({
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error({
        message: 'Logout failed',
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Logout failed',
        code: 'LOGOUT_FAILED',
      });
    }
  }
);

/**
 * @route GET /auth/me
 * @desc Get current authenticated user profile
 * @access Private
 */
router.get(
  '/me',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error({
        message: 'Failed to get user profile',
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_FAILED',
      });
    }
  }
);

/**
 * @route POST /auth/password/reset-request
 * @desc Request password reset email
 * @access Public
 */
router.post(
  '/password/reset-request',
  passwordResetRateLimiter,
  validateBody(passwordResetRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Always return success to prevent email enumeration
      await passwordResetService.requestPasswordReset(
        email,
        req.ip,
        req.get('User-Agent')
      );

      logger.info({
        message: 'Password reset requested',
        email,
        ip: req.ip,
      });

      res.json({
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    } catch (error: any) {
      logger.error({
        message: 'Password reset request failed',
        error: error.message,
        ip: req.ip,
      });

      // Still return success to prevent enumeration
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    }
  }
);

/**
 * @route POST /auth/password/reset
 * @desc Reset password using reset token
 * @access Public (with valid reset token)
 */
router.post(
  '/password/reset',
  passwordResetRateLimiter,
  validateBody(passwordResetSchema),
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      await passwordResetService.resetPassword(token, password);

      logger.info({
        message: 'Password reset successful',
        ip: req.ip,
      });

      res.json({
        message: 'Password reset successful. Please log in with your new password.',
      });
    } catch (error: any) {
      logger.warn({
        message: 'Password reset failed',
        error: error.message,
        ip: req.ip,
      });

      if (error.message.includes('expired') || error.message.includes('invalid')) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN',
        });
      }

      res.status(500).json({
        error: 'Password reset failed',
        code: 'RESET_FAILED',
      });
    }
  }
);

/**
 * @route POST /auth/password/change
 * @desc Change password for authenticated user
 * @access Private
 */
router.post(
  '/password/change',
  ensureAuthenticated,
  validateBody(changePasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { currentPassword, newPassword } = req.body;

      await passwordResetService.changePassword(
        user.id,
        currentPassword,
        newPassword
      );

      logger.info({
        message: 'Password changed successfully',
        userId: user.id,
        ip: req.ip,
      });

      res.json({
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.warn({
        message: 'Password change failed',
        error: error.message,
        userId: (req as any).user?.id,
        ip: req.ip,
      });

      if (error.message.includes('incorrect')) {
        return res.status(400).json({
          error: 'Current password is incorrect',
          code: 'INCORRECT_PASSWORD',
        });
      }

      res.status(500).json({
        error: 'Password change failed',
        code: 'CHANGE_FAILED',
      });
    }
  }
);

/**
 * @route GET /auth/verify-token
 * @desc Verify if a token is valid
 * @access Public
 */
router.get(
  '/verify-token',
  async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          valid: false,
          error: 'No token provided',
          code: 'NO_TOKEN',
        });
      }

      const user = await authService.verifyToken(token);

      if (!user) {
        return res.status(401).json({
          valid: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        });
      }

      res.json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      res.status(401).json({
        valid: false,
        error: 'Token verification failed',
        code: 'VERIFICATION_FAILED',
      });
    }
  }
);

/**
 * @route POST /auth/revoke-token
 * @desc Revoke a specific token (for security purposes)
 * @access Private
 */
router.post(
  '/revoke-token',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const user = (req as any).user;

      if (!token) {
        return res.status(400).json({
          error: 'Token is required',
          code: 'TOKEN_REQUIRED',
        });
      }

      await authService.revokeToken(token);

      logger.info({
        message: 'Token revoked successfully',
        userId: user.id,
        ip: req.ip,
      });

      res.json({
        message: 'Token revoked successfully',
      });
    } catch (error: any) {
      logger.error({
        message: 'Token revocation failed',
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Token revocation failed',
        code: 'REVOCATION_FAILED',
      });
    }
  }
);

export default router;
