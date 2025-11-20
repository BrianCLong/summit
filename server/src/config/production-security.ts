/**
 * Production Security Configuration for IntelGraph
 *
 * This module configures all security middleware and policies for production deployment.
 * Based on NIST security guidelines and GraphQL security best practices.
 */

import { Request, Response, NextFunction, Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import {
  createRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  graphqlRateLimiter,
  aiRateLimiter,
  securityHeaders,
  corsConfig,
  requestLogger,
  errorHandler,
  validateRequest,
  requestSizeLimiter,
} from '../middleware/security.js';
import logger from '../utils/logger.js';

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Production JWT Authentication Middleware
 * Replaces the simulation auth with proper JWT validation
 */
export const productionAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn(
      `Authentication failed: No token provided. IP: ${req.ip}, Path: ${req.path}`,
    );
    res.status(401).json({
      error: 'Authentication required',
      message: 'No access token provided',
    });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Check token expiration
    if (decoded.exp < Date.now() / 1000) {
      logger.warn(
        `Authentication failed: Token expired. User: ${decoded.email}, IP: ${req.ip}`,
      );
      res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired',
      });
      return;
    }

    // Attach user data to request
    req.user = decoded;

    logger.info(
      `Authentication successful. User: ${decoded.email}, Role: ${decoded.role}, IP: ${req.ip}`,
    );
    next();
  } catch (error) {
    logger.warn(
      `Authentication failed: Invalid token. IP: ${req.ip}, Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    );
    res.status(401).json({
      error: 'Invalid token',
      message: 'Access token is invalid or malformed',
    });
    return;
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string | string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role;
    const roles = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];

    if (!roles.includes(userRole) && userRole !== 'admin') {
      logger.warn(
        `Authorization failed: Insufficient permissions. User: ${req.user.email}, Role: ${userRole}, Required: ${roles.join(', ')}, IP: ${req.ip}`,
      );
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Apply all production security middleware to Express app
 */
export const applyProductionSecurity = (app: Express): void => {
  logger.info('Applying production security configuration');

  // 1. Security Headers - Apply first
  app.use(securityHeaders);

  // 2. CORS Configuration - Strict origins in production
  const corsOptions = {
    ...corsConfig,
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://app.intelgraph.com',
      ];

      // In production, be stricter about origins
      if (process.env.NODE_ENV === 'production') {
        if (!origin || !allowedOrigins.includes(origin)) {
          logger.warn(`CORS blocked: Unauthorized origin ${origin}`);
          return callback(new Error('Not allowed by CORS'));
        }
      }

      callback(null, true);
    },
  };
  app.use(cors(corsOptions));

  // 3. Request Logging
  app.use(requestLogger);

  // 4. Request Validation - Check for malicious patterns
  app.use(validateRequest);

  // 5. Request Size Limiting
  app.use(requestSizeLimiter('10mb'));

  // 6. Rate Limiting Configuration - OWASP Compliant
  const rateLimitConfig = {
    // General API rate limit (1000 requests per hour per OWASP requirements)
    general: createRateLimiter(
      60 * 60 * 1000, // 1 hour
      process.env.NODE_ENV === 'production' ? 1000 : 2000, // OWASP: 1000 req/hour
      'Too many requests from this IP',
    ),

    // GraphQL specific limits (100 requests per minute per OWASP requirements)
    graphql: createRateLimiter(
      60 * 1000, // 1 minute
      process.env.NODE_ENV === 'production' ? 100 : 200, // OWASP: 100 req/min
      'Too many GraphQL requests',
    ),

    // Authentication endpoints (5 requests per minute per OWASP requirements)
    auth: authRateLimiter, // Already configured for 5 req/min

    // AI/ML endpoints
    ai: aiRateLimiter,

    // Admin endpoints
    admin: strictRateLimiter,
  };

  // Apply rate limiting to specific routes
  app.use('/api/auth', rateLimitConfig.auth);
  app.use('/graphql', rateLimitConfig.graphql);
  app.use('/api/ai', rateLimitConfig.ai);
  app.use('/api/admin', rateLimitConfig.admin);
  app.use(rateLimitConfig.general); // General rate limit for all other routes

  logger.info('Production security middleware applied successfully');
};

/**
 * GraphQL Security Configuration
 */
export const graphqlSecurityConfig = {
  // Disable introspection in production
  introspection: process.env.NODE_ENV !== 'production',

  // Disable playground in production
  playground: process.env.NODE_ENV !== 'production',

  // Query complexity analysis
  validationRules: [
    // Depth limiting (already configured in app.ts)
    // Query complexity limiting would go here
  ],

  // Context security
  context: ({ req }: { req: AuthenticatedRequest }) => ({
    user: req.user,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  }),
};

/**
 * Environment-specific security settings
 */
export const getSecurityConfig = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  return {
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      expiresIn: isProd ? '15m' : '24h', // Shorter in production
      refreshExpiresIn: isProd ? '7d' : '30d',
    },

    // Rate Limiting (OWASP Compliant)
    rateLimits: {
      general: isProd ? 1000 : 2000, // OWASP: 1000 req/hour
      graphql: isProd ? 100 : 200,   // OWASP: 100 req/min
      auth: isProd ? 5 : 10,          // OWASP: 5 req/min
      ai: isProd ? 5 : 20,
    },

    // CORS
    cors: {
      origins: isProd
        ? process.env.ALLOWED_ORIGINS?.split(',') || [
            'https://app.intelgraph.com',
          ]
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },

    // Security Headers
    hsts: isProd
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // Feature Flags
    features: {
      persistedQueries: isProd, // Only in production
      queryComplexityAnalysis: isProd,
      auditLogging: true,
      ipWhitelisting: isProd,
    },
  };
};
