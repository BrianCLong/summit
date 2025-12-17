import { AuthenticatedSocket } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AdaptiveRateLimiter } from '../../../../lib/streaming/rate-limiter.js';

export function createRateLimitMiddleware(rateLimiter: AdaptiveRateLimiter) {
  return async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      await rateLimiter.acquire(`connection:${socket.tenantId}:${socket.user.userId}`);
      next();
    } catch (error) {
      logger.warn(
        {
          tenantId: socket.tenantId,
          userId: socket.user.userId,
          error,
        },
        'Rate limit exceeded for connection'
      );
      return next(new Error('Rate limit exceeded'));
    }
  };
}

export function wrapHandlerWithRateLimit<T extends unknown[]>(
  socket: AuthenticatedSocket,
  rateLimiter: AdaptiveRateLimiter,
  handler: (...args: T) => void | Promise<void>
): (...args: T) => void {
  return (...args: T) => {
    const key = `message:${socket.tenantId}:${socket.user.userId}`;
    if (rateLimiter.tryAcquireSync(key)) {
      handler(...args);
    } else {
      logger.warn({ key }, 'Message dropped due to rate limit');
      socket.emit('system:error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many messages, please slow down',
      });
    }
  };
}
