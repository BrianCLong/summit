import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiter middleware with per-plugin limits
 */
export class RateLimiter {
  private static redis: any;

  /**
   * Initialize Redis connection
   */
  static async initialize() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await this.redis.connect();
  }

  /**
   * Global rate limiter
   */
  static global() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
      message: { error: 'Too many requests, please try again later' },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * Per-plugin rate limiter
   */
  static perPlugin() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const pluginId = req.params.pluginId;
      if (!pluginId) {
        return next();
      }

      try {
        // Get plugin-specific rate limit config
        const config = await this.getPluginRateLimit(pluginId);

        const key = `ratelimit:${pluginId}:${req.ip}`;
        const current = await this.redis.incr(key);

        if (current === 1) {
          await this.redis.expire(key, config.windowSeconds);
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - current).toString());

        if (current > config.maxRequests) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: await this.redis.ttl(key),
          });
        }

        next();
      } catch (error) {
        // If rate limiting fails, allow request but log error
        console.error('Rate limiting error:', error);
        next();
      }
    };
  }

  /**
   * Per-user rate limiter
   */
  static perUser() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userId = (req as any).user?.id;
      if (!userId) {
        return next();
      }

      try {
        const key = `ratelimit:user:${userId}`;
        const current = await this.redis.incr(key);

        if (current === 1) {
          await this.redis.expire(key, 60); // 1 minute window
        }

        if (current > 100) { // 100 requests per minute per user
          return res.status(429).json({
            error: 'User rate limit exceeded',
            retryAfter: await this.redis.ttl(key),
          });
        }

        next();
      } catch (error) {
        console.error('User rate limiting error:', error);
        next();
      }
    };
  }

  /**
   * Get plugin-specific rate limit configuration
   */
  private static async getPluginRateLimit(pluginId: string): Promise<RateLimitConfig> {
    // Check cache
    const cached = await this.redis.get(`plugin:ratelimit:${pluginId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default rate limit
    return {
      maxRequests: 100,
      windowSeconds: 60,
    };
  }
}

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}
