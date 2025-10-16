import { Request, Response, NextFunction } from 'express';
import { Counter, Gauge } from 'prom-client';
import { redis } from '../subscriptions/pubsub';

// Token bucket rate limiter per tenant
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getStatus() {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
      utilizationPct: Math.round(
        ((this.capacity - this.tokens) / this.capacity) * 100,
      ),
    };
  }
}

// Metrics
const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total rate limit hits by tenant',
  labelNames: ['tenant_id', 'endpoint'],
});

const activeConnections = new Gauge({
  name: 'active_connections_current',
  help: 'Current active connections per tenant',
  labelNames: ['tenant_id'],
});

const tokenBuckets = new Map<string, TokenBucket>();

export function backpressureMiddleware(
  options: {
    tokensPerSecond?: number;
    burstCapacity?: number;
    globalLimit?: number;
  } = {},
) {
  const {
    tokensPerSecond = 100, // per tenant per second
    burstCapacity = 1000, // burst capacity per tenant
    globalLimit = 10000, // global concurrent connections
  } = options;

  let globalConnections = 0;

  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const endpoint = req.route?.path || req.path;

    // Global connection limit
    if (globalConnections >= globalLimit) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        code: 'GLOBAL_CAPACITY_EXCEEDED',
        retryAfter: 60,
      });
    }

    // Get or create token bucket for tenant
    const bucketKey = `${tenantId}:${endpoint}`;
    if (!tokenBuckets.has(bucketKey)) {
      tokenBuckets.set(
        bucketKey,
        new TokenBucket(burstCapacity, tokensPerSecond),
      );
    }

    const bucket = tokenBuckets.get(bucketKey)!;

    // Check if request can be processed
    if (!bucket.tryConsume()) {
      rateLimitHits.inc({ tenant_id: tenantId, endpoint });

      const status = bucket.getStatus();
      const retryAfter = Math.ceil((1 - status.tokens) / tokensPerSecond);

      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        limit: {
          capacity: status.capacity,
          remaining: status.tokens,
          utilizationPct: status.utilizationPct,
        },
      });
    }

    // Track connection
    globalConnections++;
    activeConnections.inc({ tenant_id: tenantId });

    // Cleanup on response end
    res.on('finish', () => {
      globalConnections--;
      activeConnections.dec({ tenant_id: tenantId });
    });

    res.on('close', () => {
      globalConnections--;
      activeConnections.dec({ tenant_id: tenantId });
    });

    next();
  };
}

export function getTenantRateStatus(tenantId: string): Record<string, any> {
  const status: Record<string, any> = {};

  for (const [key, bucket] of tokenBuckets.entries()) {
    if (key.startsWith(`${tenantId}:`)) {
      const endpoint = key.substring(tenantId.length + 1);
      status[endpoint] = bucket.getStatus();
    }
  }

  return {
    tenantId,
    endpoints: status,
    timestamp: new Date().toISOString(),
  };
}

export async function setupRedisRateLimit(
  tenantId: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redisKey = `rate:${tenantId}:${key}`;

  try {
    const current = await redis.get(redisKey);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
      return false; // Rate limit exceeded
    }

    if (count === 0) {
      // First request in window, set with TTL
      await redis.setWithTTL(redisKey, '1', windowSeconds);
    } else {
      // Increment existing counter
      const script = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local current = redis.call('GET', key) or 0
        current = tonumber(current)
        
        if current < limit then
          redis.call('INCR', key)
          return 1
        else
          return 0
        end
      `;

      const result = await redis.get('eval'); // Placeholder - needs proper Redis eval
      return result === '1';
    }

    return true;
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return true; // Fail open
  }
}

// Background cleanup of unused buckets
setInterval(() => {
  const now = Date.now();
  const cutoff = 5 * 60 * 1000; // 5 minutes

  for (const [key, bucket] of tokenBuckets.entries()) {
    if (now - bucket['lastRefill'] > cutoff) {
      tokenBuckets.delete(key);
    }
  }
}, 60000); // Run every minute
