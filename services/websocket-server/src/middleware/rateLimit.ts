/**
 * Rate Limiting Middleware using Token Bucket Algorithm
 */

import { AuthenticatedSocket } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { WebSocketConfig } from '../types/index.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number;
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: WebSocketConfig['rateLimit'];
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: WebSocketConfig['rateLimit']) {
    this.config = config;

    // Cleanup stale buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [key, bucket] of this.buckets.entries()) {
        if (now - bucket.lastRefill > staleThreshold) {
          this.buckets.delete(key);
        }
      }

      logger.debug({ buckets: this.buckets.size }, 'Rate limiter cleanup');
    }, 5 * 60 * 1000);
  }

  private getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.config.burstSize,
        lastRefill: Date.now(),
        maxTokens: this.config.burstSize,
        refillRate: this.config.messageRatePerSecond,
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  private refillTokens(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * bucket.refillRate;

    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  public tryConsume(key: string, tokens = 1): boolean {
    const bucket = this.getBucket(key);
    this.refillTokens(bucket);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }

    return false;
  }

  public getRemainingTokens(key: string): number {
    const bucket = this.getBucket(key);
    this.refillTokens(bucket);
    return Math.floor(bucket.tokens);
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.buckets.clear();
  }
}

export function createRateLimitMiddleware(rateLimiter: RateLimiter) {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    const key = `connection:${socket.tenantId}:${socket.user.userId}`;

    if (!rateLimiter.tryConsume(key, 1)) {
      logger.warn(
        {
          connectionId: socket.connectionId,
          tenantId: socket.tenantId,
          userId: socket.user.userId,
        },
        'Rate limit exceeded for connection'
      );
      return next(new Error('Rate limit exceeded'));
    }

    next();
  };
}

export function wrapHandlerWithRateLimit<T extends unknown[]>(
  socket: AuthenticatedSocket,
  rateLimiter: RateLimiter,
  handler: (...args: T) => void | Promise<void>
): (...args: T) => void {
  return (...args: T) => {
    const key = `message:${socket.tenantId}:${socket.user.userId}`;

    if (!rateLimiter.tryConsume(key, 1)) {
      logger.warn(
        {
          connectionId: socket.connectionId,
          tenantId: socket.tenantId,
          userId: socket.user.userId,
          remaining: rateLimiter.getRemainingTokens(key),
        },
        'Message rate limit exceeded'
      );

      socket.emit('system:error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many messages, please slow down',
      });

      return;
    }

    return handler(...args);
  };
}
