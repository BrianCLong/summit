/**
 * Rate Limiting Middleware
 */

import { Socket } from 'socket.io';
import { AuthenticatedSocket } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AdaptiveRateLimiter } from '../utils/AdaptiveRateLimiter.js';

export function createRateLimitMiddleware(rateLimiter: AdaptiveRateLimiter) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    // Cast to AuthenticatedSocket as authentication middleware runs before this
    const authSocket = socket as AuthenticatedSocket;

    try {
      await rateLimiter.acquire(`connection:${authSocket.tenantId}:${authSocket.user.userId}`);
      next();
    } catch (error) {
      logger.warn(
        {
          tenantId: authSocket.tenantId,
          userId: authSocket.user.userId,
          error,
        },
        'Rate limit exceeded for connection'
      );
      return next(new Error('Rate limit exceeded'));
    }
  };
}

export function wrapHandlerWithRateLimit<T extends unknown[]>(
  socket: Socket,
  rateLimiter: AdaptiveRateLimiter,
  handler: (...args: T) => void | Promise<void>
): (...args: T) => void {
  return (...args: T) => {
    const authSocket = socket as AuthenticatedSocket;
    const key = `message:${authSocket.tenantId}:${authSocket.user.userId}`;

    if (rateLimiter.tryAcquireSync(key)) {
      handler(...args);
    } else {
      logger.warn(
        {
          connectionId: authSocket.connectionId,
          tenantId: authSocket.tenantId,
          userId: authSocket.user.userId,
        },
        'Message dropped due to rate limit'
      );
      socket.emit('system:error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many messages, please slow down',
      });
    }
  };
}

// Re-export type if needed locally
export type RateLimiter = AdaptiveRateLimiter;
