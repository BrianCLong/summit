/**
 * Request validation and rate limiting middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 100,
};

/**
 * Rate limiting middleware
 */
export function rateLimiter(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    let record = requestCounts.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + config.windowMs };
      requestCounts.set(key, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetAt);

    if (record.count > config.maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Request validation middleware factory
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Request ID middleware
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.headers['x-request-id'] as string || crypto.randomUUID();
    res.setHeader('X-Request-ID', id);
    (req as Request & { requestId: string }).requestId = id;
    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'no-store');
    next();
  };
}

/**
 * Error handler middleware
 */
export function errorHandler() {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);

    const statusCode = (err as Error & { statusCode?: number }).statusCode || 400;

    res.status(statusCode).json({
      error: err.message,
      requestId: (req as Request & { requestId?: string }).requestId,
    });
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}, 60_000);
