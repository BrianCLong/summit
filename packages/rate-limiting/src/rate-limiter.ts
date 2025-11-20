/**
 * Rate Limiter - Main Class
 *
 * Coordinates rate limiting strategies and policies
 */

import { createLogger } from './utils/logger.js';

const logger = createLogger('rate-limiter');

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  retryAfter?: number;
}

export abstract class RateLimiter {
  protected config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'ratelimit',
      skipFailedRequests: false,
      skipSuccessfulRequests: false,
      ...config,
    };
  }

  abstract checkLimit(key: string): Promise<RateLimitResult>;
  abstract resetLimit(key: string): Promise<void>;

  protected getKey(identifier: string): string {
    return `${this.config.keyPrefix}:${identifier}`;
  }

  protected logRateLimit(key: string, result: RateLimitResult): void {
    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        key,
        limit: result.info.limit,
        current: result.info.current,
        resetTime: new Date(result.info.resetTime),
      });
    } else {
      logger.debug('Rate limit check passed', {
        key,
        remaining: result.info.remaining,
      });
    }
  }
}
