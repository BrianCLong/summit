import { RateLimitRequestHandler, rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { securityLogger } from '../observability/securityLogger.js';
import { resolveTenantId } from '../security/tenant.js';

const redisUrl = process.env.REDIS_URL;

let redisClient: Redis | undefined;

if (redisUrl) {
  redisClient = new Redis(redisUrl, { enableReadyCheck: false });
  redisClient.on('error', (error) => {
    securityLogger.logEvent('rate_limit_redis_error', {
      message: error.message,
    });
  });
}

const defaultMax = Number(process.env.RATE_LIMIT_MAX_PER_MINUTE || '100');
const adminMax = Number(process.env.RATE_LIMIT_ADMIN_MAX_PER_MINUTE || '60');
const tenantMax = Number(process.env.RATE_LIMIT_TENANT_MAX_PER_MINUTE || '80');

export const createRateLimiter = (): RateLimitRequestHandler => {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: (req) => {
      const tenant = resolveTenantId(req as any);
      if (req.path.startsWith('/security')) {
        return adminMax;
      }
      return tenant === 'public' ? defaultMax : tenantMax;
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) =>
      [
        resolveTenantId(req as any),
        req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
        req.method,
        req.originalUrl,
      ]
        .filter(Boolean)
        .join(':'),
    handler: (req, res) => {
      securityLogger.logEvent('rate_limit_block', {
        ip: req.ip,
        path: req.originalUrl,
      });
      securityLogger.logEvent('rate_limit_tenant_block', {
        tenant: resolveTenantId(req as any),
        path: req.originalUrl,
      });
      res.status(429).json({
        error: 'Too many requests. Please slow down.',
      });
    },
    store:
      redisClient && redisClient.status !== 'end'
        ? new RedisStore({
            sendCommand: (...args: string[]) => redisClient!.call(...args),
          })
        : undefined,
  });

  return limiter;
};
