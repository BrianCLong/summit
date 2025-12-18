/**
 * Authentication Rate Limiting Middleware
 *
 * Provides specialized rate limiting for authentication endpoints to prevent:
 * - Brute force attacks on login
 * - Credential stuffing
 * - Account enumeration via registration
 * - Password reset abuse
 *
 * @module middleware/authRateLimit
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDuration: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  blockExpires?: number;
}

/**
 * Check rate limit against Redis
 */
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // If Redis is not available, allow the request but log warning
  if (!redis) {
    logger.warn('Redis unavailable for rate limiting, allowing request');
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetTime: Date.now() + config.windowMs,
      blocked: false,
    };
  }

  const now = Date.now();
  const windowKey = `${config.keyPrefix}:${key}:window`;
  const blockKey = `${config.keyPrefix}:${key}:blocked`;

  try {
    // Check if blocked
    const blockExpires = await redis.get(blockKey);
    if (blockExpires) {
      const expiresAt = parseInt(blockExpires, 10);
      if (expiresAt > now) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: expiresAt,
          blocked: true,
          blockExpires: expiresAt,
        };
      }
    }

    // Get current count in window
    const countStr = await redis.get(windowKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= config.maxAttempts) {
      // Block the key
      const blockExpireTime = now + config.blockDuration;
      await redis.set(blockKey, blockExpireTime.toString(), 'PX', config.blockDuration);
      await redis.del(windowKey);

      return {
        allowed: false,
        remaining: 0,
        resetTime: blockExpireTime,
        blocked: true,
        blockExpires: blockExpireTime,
      };
    }

    // Increment counter
    const newCount = await redis.incr(windowKey);
    if (newCount === 1) {
      await redis.pexpire(windowKey, config.windowMs);
    }

    const ttl = await redis.pttl(windowKey);

    return {
      allowed: true,
      remaining: Math.max(0, config.maxAttempts - newCount),
      resetTime: now + (ttl > 0 ? ttl : config.windowMs),
      blocked: false,
    };
  } catch (error) {
    logger.error('Rate limit check failed:', error);
    // On error, allow the request
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetTime: Date.now() + config.windowMs,
      blocked: false,
    };
  }
}

/**
 * Create rate limiting middleware
 */
function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get client identifier (IP + optional email for login attempts)
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email || '';
    const key = email ? `${ip}:${email}` : ip;

    const result = await checkRateLimit(key, config);

    // Set rate limit headers
    res.set('X-RateLimit-Limit', config.maxAttempts.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.set('Retry-After', retryAfter.toString());

      logger.warn({
        message: 'Rate limit exceeded',
        ip,
        email: email || undefined,
        keyPrefix: config.keyPrefix,
        blocked: result.blocked,
        retryAfter,
      });

      return res.status(429).json({
        error: result.blocked
          ? 'Too many attempts. Please try again later.'
          : 'Rate limit exceeded. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        blocked: result.blocked,
      });
    }

    next();
  };
}

/**
 * Record failed login attempt (increases counter faster)
 */
export async function recordFailedLogin(ip: string, email: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  const key = `auth:login:${ip}:${email}`;

  try {
    // Add extra penalty for failed attempts
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, 15 * 60 * 1000); // 15 minutes
    }

    // If too many failures, block immediately
    if (count >= 5) {
      const blockKey = `auth:login:${ip}:${email}:blocked`;
      const blockDuration = Math.min(count * 60 * 1000, 3600000); // Max 1 hour
      await redis.set(blockKey, (Date.now() + blockDuration).toString(), 'PX', blockDuration);
    }
  } catch (error) {
    logger.error('Failed to record failed login:', error);
  }
}

/**
 * Clear failed login attempts on successful login
 */
export async function clearFailedLogins(ip: string, email: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const windowKey = `auth:login:${ip}:${email}`;
    const blockKey = `auth:login:${ip}:${email}:blocked`;
    await redis.del(windowKey, blockKey);
  } catch (error) {
    logger.error('Failed to clear failed logins:', error);
  }
}

// Rate limiter configurations

/**
 * General auth rate limiter
 * 100 requests per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 100,
  blockDuration: 30 * 60 * 1000, // 30 minutes
  keyPrefix: 'auth:general',
});

/**
 * Login rate limiter
 * 5 attempts per 15 minutes per IP+email
 * More restrictive to prevent brute force
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  blockDuration: 15 * 60 * 1000, // 15 minutes block
  keyPrefix: 'auth:login',
});

/**
 * Registration rate limiter
 * 3 registrations per hour per IP
 * Prevents mass account creation
 */
export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3,
  blockDuration: 60 * 60 * 1000, // 1 hour block
  keyPrefix: 'auth:register',
});

/**
 * Password reset rate limiter
 * 3 requests per hour per IP
 * Prevents abuse of password reset emails
 */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3,
  blockDuration: 60 * 60 * 1000, // 1 hour block
  keyPrefix: 'auth:reset',
});

/**
 * Token refresh rate limiter
 * 20 refreshes per 15 minutes per IP
 */
export const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 20,
  blockDuration: 15 * 60 * 1000, // 15 minutes block
  keyPrefix: 'auth:refresh',
});

export default {
  authRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  refreshRateLimiter,
  recordFailedLogin,
  clearFailedLogins,
};
