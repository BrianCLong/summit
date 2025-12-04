import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { cfg } from '../config.js';
import logger from '../utils/logger.js';
import AuthService from '../services/AuthService.js';

/**
 * Production Authentication Middleware
 * Verifies JWT tokens using AuthService and attaches the user to the request.
 * Designed to be used in the `authenticateToken` chain in app.ts.
 */
export const productionAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // 401 Unauthorized: No credentials provided
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const authService = new AuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      // 403 Forbidden: Credentials invalid or blacklisted
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({ error: 'Forbidden: Token verification failed' });
  }
};

/**
 * Apply Production Security Configurations
 * This function is called during app initialization in production mode.
 * It supplements the standard security middleware (Helmet, CORS) defined in app.ts.
 */
export const applyProductionSecurity = (app: any) => {
  logger.info('Applying additional production security configurations...');

  // Future hardening:
  // - Strict Content Security Policy (CSP)
  // - HSTS enforcement (if not handled by load balancer)
  // - TLS version enforcement
  // - Additional rate limiting strategies
};
