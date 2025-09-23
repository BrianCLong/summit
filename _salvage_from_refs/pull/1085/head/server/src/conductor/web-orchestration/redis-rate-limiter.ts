// server/src/conductor/web-orchestration/redis-rate-limiter.ts

import { createClient } from 'redis';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface TokenBucketConfig {
  domain: string;
  capacity: number; // Maximum tokens
  refillRate: number; // Tokens per second
  burstAllowance?: number; // Allow brief bursts
}

interface RateLimitResult {
  allowed: boolean;
  tokensRemaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RedisRateLimiter {
  private redis: ReturnType<typeof createClient>;
  private defaultConfig: TokenBucketConfig = {
    domain: 'default',
    capacity: 60,
    refillRate: 1/60, // 1 request per minute by default
    burstAllowance: 5
  };

  private domainConfigs: Map<string, TokenBucketConfig> = new Map([
    // High-value compliant domains with generous limits
    ['docs.python.org', { domain: 'docs.python.org', capacity: 300, refillRate: 5/60 }],
    ['github.com', { domain: 'github.com', capacity: 240, refillRate: 4/60, burstAllowance: 10 }],
    ['stackoverflow.com', { domain: 'stackoverflow.com', capacity: 180, refillRate: 3/60 }],
    ['arxiv.org', { domain: 'arxiv.org', capacity: 120, refillRate: 2/60 }],
    ['nist.gov', { domain: 'nist.gov', capacity: 90, refillRate: 1.5/60 }],
    ['kubernetes.io', { domain: 'kubernetes.io', capacity: 150, refillRate: 2.5/60 }],
    
    // Additional domains for Day 1 completion
    ['nodejs.org', { domain: 'nodejs.org', capacity: 120, refillRate: 2/60 }],
    ['developer.mozilla.org', { domain: 'developer.mozilla.org', capacity: 200, refillRate: 3/60 }],
    ['wikipedia.org', { domain: 'wikipedia.org', capacity: 100, refillRate: 1.5/60 }],
    ['openai.com', { domain: 'openai.com', capacity: 60, refillRate: 1/60 }]
  ]);

  constructor() {
    this.redis = createClient({ url: process.env.REDIS_URL });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    logger.info('Redis rate limiter connected');
  }

  /**
   * Check rate limit using token bucket algorithm
   */
  async checkRateLimit(
    domain: string, 
    tenantId: string, 
    requestCount: number = 1
  ): Promise<RateLimitResult> {
    const config = this.domainConfigs.get(domain) || { 
      ...this.defaultConfig, 
      domain 
    };

    const bucketKey = `rate_bucket:${domain}:${tenantId}`;
    const now = Date.now() / 1000; // Unix timestamp in seconds
    
    try {
      // Use Redis Lua script for atomic token bucket operation
      const luaScript = `
        local bucket_key = KEYS[1]
        local now = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local refill_rate = tonumber(ARGV[3])
        local requested_tokens = tonumber(ARGV[4])
        local burst_allowance = tonumber(ARGV[5]) or 0
        
        -- Get current bucket state
        local bucket = redis.call('HMGET', bucket_key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now
        
        -- Calculate tokens to add based on elapsed time
        local elapsed = now - last_refill
        local tokens_to_add = elapsed * refill_rate
        tokens = math.min(capacity + burst_allowance, tokens + tokens_to_add)
        
        -- Check if request can be fulfilled
        if tokens >= requested_tokens then
          tokens = tokens - requested_tokens
          
          -- Update bucket state
          redis.call('HMSET', bucket_key, 
            'tokens', tokens,
            'last_refill', now
          )
          redis.call('EXPIRE', bucket_key, 7200) -- 2 hour expiry
          
          return {1, tokens, now + ((capacity - tokens) / refill_rate)}
        else
          -- Request denied - calculate retry after
          local retry_after = (requested_tokens - tokens) / refill_rate
          return {0, tokens, now + retry_after, retry_after}
        end
      `;

      const result = await this.redis.eval(luaScript, {
        keys: [bucketKey],
        arguments: [
          now.toString(),
          config.capacity.toString(),
          config.refillRate.toString(),
          requestCount.toString(),
          (config.burstAllowance || 0).toString()
        ]
      }) as number[];

      const [allowed, tokensRemaining, resetTime, retryAfter] = result;

      const rateLimitResult: RateLimitResult = {
        allowed: allowed === 1,
        tokensRemaining: Math.floor(tokensRemaining),
        resetTime: Math.floor(resetTime),
        retryAfter: retryAfter ? Math.ceil(retryAfter) : undefined
      };

      // Record metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'rate_limit_check',
        rateLimitResult.allowed,
        { 
          domain, 
          tenant_id: tenantId,
          tokens_remaining: rateLimitResult.tokensRemaining.toString()
        }
      );

      if (!rateLimitResult.allowed) {
        logger.info('Rate limit exceeded', {
          domain,
          tenantId,
          tokensRemaining: rateLimitResult.tokensRemaining,
          retryAfter: rateLimitResult.retryAfter
        });
      }

      return rateLimitResult;

    } catch (error) {
      logger.error('Rate limit check failed', { 
        domain, 
        tenantId, 
        error: error.message 
      });
      
      // Fail open for availability
      return {
        allowed: true,
        tokensRemaining: config.capacity,
        resetTime: Math.floor(now + 3600)
      };
    }
  }

  /**
   * Get current bucket status
   */
  async getBucketStatus(domain: string, tenantId: string): Promise<{
    tokens: number;
    capacity: number;
    refillRate: number;
    resetTime: number;
  }> {
    const config = this.domainConfigs.get(domain) || { ...this.defaultConfig, domain };
    const bucketKey = `rate_bucket:${domain}:${tenantId}`;
    const now = Date.now() / 1000;

    try {
      const bucket = await this.redis.hmget(bucketKey, 'tokens', 'last_refill');
      const tokens = parseFloat(bucket.tokens || config.capacity.toString());
      const lastRefill = parseFloat(bucket.last_refill || now.toString());
      
      // Calculate current tokens with refill
      const elapsed = now - lastRefill;
      const tokensToAdd = elapsed * config.refillRate;
      const currentTokens = Math.min(config.capacity, tokens + tokensToAdd);
      
      return {
        tokens: Math.floor(currentTokens),
        capacity: config.capacity,
        refillRate: config.refillRate,
        resetTime: Math.floor(now + ((config.capacity - currentTokens) / config.refillRate))
      };

    } catch (error) {
      logger.error('Failed to get bucket status', { domain, tenantId, error: error.message });
      return {
        tokens: config.capacity,
        capacity: config.capacity,
        refillRate: config.refillRate,
        resetTime: Math.floor(now + 3600)
      };
    }
  }

  /**
   * Update domain configuration
   */
  async updateDomainConfig(domain: string, config: Partial<TokenBucketConfig>): Promise<void> {
    const existingConfig = this.domainConfigs.get(domain) || { ...this.defaultConfig, domain };
    const newConfig = { ...existingConfig, ...config };
    
    this.domainConfigs.set(domain, newConfig);
    
    // Persist to Redis for cross-instance sync
    await this.redis.hset('rate_limit_configs', domain, JSON.stringify(newConfig));
    
    logger.info('Updated domain rate limit config', { domain, config: newConfig });
  }

  /**
   * Load domain configurations from Redis
   */
  async loadDomainConfigs(): Promise<void> {
    try {
      const configs = await this.redis.hgetall('rate_limit_configs');
      
      for (const [domain, configStr] of Object.entries(configs)) {
        try {
          const config = JSON.parse(configStr);
          this.domainConfigs.set(domain, config);
        } catch (error) {
          logger.warn('Failed to parse domain config', { domain, error: error.message });
        }
      }
      
      logger.info('Loaded domain rate limit configs', { 
        count: this.domainConfigs.size 
      });

    } catch (error) {
      logger.error('Failed to load domain configs', { error: error.message });
    }
  }

  /**
   * Reset bucket for domain/tenant
   */
  async resetBucket(domain: string, tenantId: string): Promise<void> {
    const bucketKey = `rate_bucket:${domain}:${tenantId}`;
    await this.redis.del(bucketKey);
    
    logger.info('Reset rate limit bucket', { domain, tenantId });
    
    prometheusConductorMetrics.recordOperationalEvent(
      'rate_limit_reset',
      true,
      { domain, tenant_id: tenantId }
    );
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(): Promise<{
    totalBuckets: number;
    activeDomains: number;
    avgTokensRemaining: number;
  }> {
    try {
      const keys = await this.redis.keys('rate_bucket:*');
      const activeDomains = new Set(keys.map(key => key.split(':')[1])).size;
      
      let totalTokens = 0;
      let bucketCount = 0;
      
      for (const key of keys.slice(0, 100)) { // Sample first 100 for performance
        const tokens = await this.redis.hget(key, 'tokens');
        if (tokens) {
          totalTokens += parseFloat(tokens);
          bucketCount++;
        }
      }
      
      return {
        totalBuckets: keys.length,
        activeDomains,
        avgTokensRemaining: bucketCount > 0 ? totalTokens / bucketCount : 0
      };

    } catch (error) {
      logger.error('Failed to get rate limit stats', { error: error.message });
      return { totalBuckets: 0, activeDomains: 0, avgTokensRemaining: 0 };
    }
  }
}