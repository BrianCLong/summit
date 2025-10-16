/**
 * Redis Token Bucket Rate Limiter
 * Implements distributed rate limiting with token buckets for tenant/operation isolation
 */

import Redis from 'ioredis';
import logger from '../utils/logger';

interface TokenBucketConfig {
  capacity: number; // Maximum tokens in bucket
  refillRate: number; // Tokens per second to add
  refillIntervalMs: number; // How often to refill (milliseconds)
  keyPrefix?: string; // Redis key prefix
}

interface TakeTokensResult {
  allowed: boolean;
  remaining: number;
  resetTime?: number; // When bucket will next have tokens (if denied)
  bucketState: {
    capacity: number;
    tokens: number;
    lastRefill: number;
  };
}

/**
 * Lua script for atomic token bucket operations
 * Ensures thread-safe token taking with refill logic
 */
const TAKE_TOKENS_LUA = `
-- Key format: bucket:{tenant}:{operation}
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3]) 
local refillIntervalMs = tonumber(ARGV[4])
local tokensRequested = tonumber(ARGV[5])
local minTokens = tonumber(ARGV[6] or "1")

-- Get current bucket state
local bucketData = redis.call('HMGET', key, 'tokens', 'lastRefill')
local currentTokens = tonumber(bucketData[1]) or capacity
local lastRefill = tonumber(bucketData[2]) or now

-- Calculate tokens to add based on elapsed time
local elapsed = math.max(0, now - lastRefill)
local refillPeriods = math.floor(elapsed / refillIntervalMs)
local tokensToAdd = refillPeriods * refillRate

-- Update token count (capped at capacity)
currentTokens = math.min(capacity, currentTokens + tokensToAdd)
local newRefillTime = lastRefill + (refillPeriods * refillIntervalMs)

-- Check if we have enough tokens
if currentTokens >= tokensRequested then
  -- Take tokens and update bucket
  currentTokens = currentTokens - tokensRequested
  redis.call('HMSET', key, 'tokens', currentTokens, 'lastRefill', newRefillTime)
  redis.call('EXPIRE', key, 3600) -- Expire unused buckets after 1 hour
  
  return {1, currentTokens, capacity, newRefillTime, 0} -- allowed=1, remaining, capacity, lastRefill, resetTime
else
  -- Denied - calculate when next token will be available
  local tokensNeeded = tokensRequested - currentTokens
  local periodsUntilRefill = math.ceil(tokensNeeded / refillRate)
  local resetTime = newRefillTime + (periodsUntilRefill * refillIntervalMs)
  
  -- Update bucket state even on denial (for accurate tracking)
  redis.call('HMSET', key, 'tokens', currentTokens, 'lastRefill', newRefillTime)
  redis.call('EXPIRE', key, 3600)
  
  return {0, currentTokens, capacity, newRefillTime, resetTime} -- allowed=0, remaining, capacity, lastRefill, resetTime
end
`;

/**
 * Lua script for batch token operations
 * Allows atomic taking of multiple token amounts in a single operation
 */
const BATCH_TAKE_TOKENS_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3])
local refillIntervalMs = tonumber(ARGV[4])

-- Parse batch requests: [tokens1, op1, tokens2, op2, ...]
local requests = {}
local totalTokensRequested = 0
for i = 5, #ARGV, 2 do
  local tokens = tonumber(ARGV[i])
  local operation = ARGV[i + 1]
  table.insert(requests, {tokens = tokens, operation = operation})
  totalTokensRequested = totalTokensRequested + tokens
end

-- Get current bucket state
local bucketData = redis.call('HMGET', key, 'tokens', 'lastRefill')
local currentTokens = tonumber(bucketData[1]) or capacity
local lastRefill = tonumber(bucketData[2]) or now

-- Calculate refill
local elapsed = math.max(0, now - lastRefill)
local refillPeriods = math.floor(elapsed / refillIntervalMs)
local tokensToAdd = refillPeriods * refillRate
currentTokens = math.min(capacity, currentTokens + tokensToAdd)
local newRefillTime = lastRefill + (refillPeriods * refillIntervalMs)

-- Check if batch can proceed
if currentTokens >= totalTokensRequested then
  -- All requests approved
  currentTokens = currentTokens - totalTokensRequested
  redis.call('HMSET', key, 'tokens', currentTokens, 'lastRefill', newRefillTime)
  redis.call('EXPIRE', key, 3600)
  
  local results = {}
  for i, req in ipairs(requests) do
    table.insert(results, 1) -- approved
    table.insert(results, req.tokens)
    table.insert(results, req.operation)
  end
  table.insert(results, currentTokens) -- remaining tokens
  return results
else
  -- Batch denied - no tokens taken
  redis.call('HMSET', key, 'tokens', currentTokens, 'lastRefill', newRefillTime)
  redis.call('EXPIRE', key, 3600)
  
  local results = {}
  for i, req in ipairs(requests) do
    table.insert(results, 0) -- denied
    table.insert(results, req.tokens)
    table.insert(results, req.operation)
  end
  table.insert(results, currentTokens) -- remaining tokens
  return results
end
`;

/**
 * Redis-backed token bucket rate limiter
 */
export class RedisBucket {
  private client: RedisClientType;
  private connected: boolean = false;
  private luaScriptSha: string | null = null;
  private batchScriptSha: string | null = null;

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        commandTimeout: 2000,
      },
      retry: {
        retries: 3,
        factor: 2,
      },
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.connected = false;
    });
  }

  /**
   * Initialize Redis connection and load Lua scripts
   */
  async init(): Promise<void> {
    if (this.connected) return;

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Load Lua scripts for atomic operations
      this.luaScriptSha = await this.client.scriptLoad(TAKE_TOKENS_LUA);
      this.batchScriptSha = await this.client.scriptLoad(BATCH_TAKE_TOKENS_LUA);

      this.connected = true;
      logger.info('RedisBucket initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RedisBucket:', error);
      throw error;
    }
  }

  /**
   * Take tokens from a bucket
   */
  async takeTokens(
    tenant: string,
    operation: string,
    tokensRequested: number = 1,
    config: Partial<TokenBucketConfig> = {},
  ): Promise<TakeTokensResult> {
    await this.ensureConnected();

    const {
      capacity = 100,
      refillRate = 10,
      refillIntervalMs = 1000,
      keyPrefix = 'bucket',
    } = config;

    const key = `${keyPrefix}:${tenant}:${operation}`;
    const now = Date.now();

    try {
      const result: [number, number, number, number, number] =
        (await this.client.evalSha(this.luaScriptSha!, {
          keys: [key],
          arguments: [
            now.toString(),
            capacity.toString(),
            refillRate.toString(),
            refillIntervalMs.toString(),
            tokensRequested.toString(),
            '1', // minTokens
          ],
        })) as any;

      const [allowed, remaining, bucketCapacity, lastRefill, resetTime] =
        result;

      return {
        allowed: allowed === 1,
        remaining,
        resetTime: resetTime > 0 ? resetTime : undefined,
        bucketState: {
          capacity: bucketCapacity,
          tokens: remaining,
          lastRefill,
        },
      };
    } catch (error) {
      logger.error('Failed to take tokens from bucket:', {
        tenant,
        operation,
        error,
      });

      // Fallback: allow request but log the failure
      return {
        allowed: true,
        remaining: capacity,
        bucketState: {
          capacity,
          tokens: capacity,
          lastRefill: now,
        },
      };
    }
  }

  /**
   * Take tokens from multiple operations atomically
   */
  async takeTokensBatch(
    tenant: string,
    requests: Array<{ operation: string; tokens: number }>,
    config: Partial<TokenBucketConfig> = {},
  ): Promise<{
    allowed: boolean;
    results: Array<{ operation: string; tokens: number; approved: boolean }>;
    remaining: number;
  }> {
    await this.ensureConnected();

    const {
      capacity = 100,
      refillRate = 10,
      refillIntervalMs = 1000,
      keyPrefix = 'bucket',
    } = config;

    const key = `${keyPrefix}:${tenant}:batch`;
    const now = Date.now();

    // Build arguments for Lua script
    const args = [
      now.toString(),
      capacity.toString(),
      refillRate.toString(),
      refillIntervalMs.toString(),
    ];

    for (const req of requests) {
      args.push(req.tokens.toString(), req.operation);
    }

    try {
      const result: any[] = (await this.client.evalSha(this.batchScriptSha!, {
        keys: [key],
        arguments: args,
      })) as any;

      const results: Array<{
        operation: string;
        tokens: number;
        approved: boolean;
      }> = [];
      const remaining = result[result.length - 1];
      let allApproved = true;

      // Parse results (triplets: approved, tokens, operation)
      for (let i = 0; i < result.length - 1; i += 3) {
        const approved = result[i] === 1;
        const tokens = result[i + 1];
        const operation = result[i + 2];

        results.push({ operation, tokens, approved });
        if (!approved) allApproved = false;
      }

      return {
        allowed: allApproved,
        results,
        remaining,
      };
    } catch (error) {
      logger.error('Failed to take tokens in batch:', {
        tenant,
        requests,
        error,
      });

      // Fallback: approve all requests
      return {
        allowed: true,
        results: requests.map((req) => ({ ...req, approved: true })),
        remaining: capacity,
      };
    }
  }

  /**
   * Get bucket status without taking tokens
   */
  async getBucketStatus(
    tenant: string,
    operation: string,
    config: Partial<TokenBucketConfig> = {},
  ): Promise<{
    tokens: number;
    capacity: number;
    lastRefill: number;
    nextRefill: number;
  }> {
    await this.ensureConnected();

    const { keyPrefix = 'bucket', refillIntervalMs = 1000 } = config;
    const key = `${keyPrefix}:${tenant}:${operation}`;

    try {
      const bucketData = await this.client.hmGet(key, [
        'tokens',
        'lastRefill',
        'capacity',
      ]);
      const tokens = parseInt(bucketData[0] || '0');
      const lastRefill = parseInt(bucketData[1] || Date.now().toString());
      const capacity = parseInt(bucketData[2] || '100');

      return {
        tokens,
        capacity,
        lastRefill,
        nextRefill: lastRefill + refillIntervalMs,
      };
    } catch (error) {
      logger.error('Failed to get bucket status:', {
        tenant,
        operation,
        error,
      });
      return {
        tokens: 0,
        capacity: 100,
        lastRefill: Date.now(),
        nextRefill: Date.now() + refillIntervalMs,
      };
    }
  }

  /**
   * Reset a bucket (set to full capacity)
   */
  async resetBucket(
    tenant: string,
    operation: string,
    config: Partial<TokenBucketConfig> = {},
  ): Promise<void> {
    await this.ensureConnected();

    const { keyPrefix = 'bucket', capacity = 100 } = config;
    const key = `${keyPrefix}:${tenant}:${operation}`;
    const now = Date.now();

    try {
      await this.client.hSet(key, {
        tokens: capacity.toString(),
        lastRefill: now.toString(),
        capacity: capacity.toString(),
      });
      await this.client.expire(key, 3600);

      logger.info('Bucket reset successfully', { tenant, operation, capacity });
    } catch (error) {
      logger.error('Failed to reset bucket:', { tenant, operation, error });
    }
  }

  /**
   * Get global rate limiting statistics
   */
  async getGlobalStats(): Promise<{
    totalBuckets: number;
    activeBuckets: number;
    memoryUsage: number;
  }> {
    await this.ensureConnected();

    try {
      const keys = await this.client.keys('bucket:*');
      const info = await this.client.info('memory');

      // Extract memory usage (simplified)
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        totalBuckets: keys.length,
        activeBuckets: keys.length, // Simplified - could check TTL
        memoryUsage,
      };
    } catch (error) {
      logger.error('Failed to get global stats:', error);
      return {
        totalBuckets: 0,
        activeBuckets: 0,
        memoryUsage: 0,
      };
    }
  }

  /**
   * Cleanup expired buckets (maintenance operation)
   */
  async cleanupExpired(): Promise<number> {
    await this.ensureConnected();

    try {
      const keys = await this.client.keys('bucket:*');
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -1) {
          // No TTL set
          await this.client.expire(key, 3600);
        } else if (ttl === -2) {
          // Key doesn't exist
          cleaned++;
        }
      }

      logger.info('Bucket cleanup completed', {
        totalKeys: keys.length,
        cleaned,
      });
      return cleaned;
    } catch (error) {
      logger.error('Failed to cleanup expired buckets:', error);
      return 0;
    }
  }

  /**
   * Ensure Redis connection is active
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected || !this.client.isOpen) {
      await this.init();
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
    this.connected = false;
  }
}

/**
 * Global singleton instance for use across the application
 */
let globalBucket: RedisBucket | null = null;

export function getRedisBucket(): RedisBucket {
  if (!globalBucket) {
    globalBucket = new RedisBucket();
  }
  return globalBucket;
}

/**
 * Rate limiting middleware factory for Express
 */
export function createBucketMiddleware(config: {
  capacity?: number;
  refillRate?: number;
  refillIntervalMs?: number;
  getKey?: (req: any) => { tenant: string; operation: string };
  onDenied?: (req: any, res: any, resetTime?: number) => void;
}) {
  const bucket = getRedisBucket();

  return async (req: any, res: any, next: any) => {
    try {
      const getKey =
        config.getKey ||
        ((req) => ({
          tenant: req.user?.tenantId || 'default',
          operation: `${req.method}:${req.route?.path || req.path}`,
        }));

      const { tenant, operation } = getKey(req);
      const result = await bucket.takeTokens(tenant, operation, 1, config);

      if (!result.allowed) {
        const onDenied =
          config.onDenied ||
          ((req, res, resetTime) => {
            res.status(429).json({
              error: 'Rate limit exceeded',
              resetTime,
              remaining: result.remaining,
            });
          });

        return onDenied(req, res, result.resetTime);
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', result.bucketState.capacity);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      next();
    } catch (error) {
      logger.error('Rate limiting middleware error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}
