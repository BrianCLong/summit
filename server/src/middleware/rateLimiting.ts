import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
}

export function rateLimiter({ windowMs = 60000, max = 60 }: RateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({ windowMs, max });
}


