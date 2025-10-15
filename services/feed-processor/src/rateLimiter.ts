import Redis from 'ioredis';
import pino from 'pino';

export type RateLimitScope = 'tenant' | 'user';

export interface RateLimitConfig {
  maxPerMinute: number;
  burst: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  retryInMs: number;
  scope: RateLimitScope;
  scopeId: string;
  config: RateLimitConfig;
}

export interface EnsureWithinLimitOptions {
  tenantId?: string;
  userId?: string;
  tokens: number;
  metadata?: Record<string, unknown>;
}

const CONFIG_PREFIX = 'feed:ingestion:config';
const STATE_PREFIX = 'feed:ingestion:state';
const DEFAULT_SCOPE = 'default';

const TOKEN_BUCKET_LUA = `
local tokensKey = KEYS[1]
local timestampKey = KEYS[2]
local now = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

if requested <= 0 then
  return {1, capacity, 0}
end

if refillRate <= 0 then
  return {0, 0, 60000}
end

local tokens = tonumber(redis.call('GET', tokensKey))
if not tokens then
  tokens = capacity
end

local lastRefill = tonumber(redis.call('GET', timestampKey))
if not lastRefill then
  lastRefill = now
end

local delta = now - lastRefill
if delta < 0 then
  delta = 0
end

local accrued = delta * refillRate
if accrued > 0 then
  tokens = math.min(capacity, tokens + accrued)
end

if tokens < requested then
  redis.call('SET', tokensKey, tokens)
  redis.call('SET', timestampKey, now)
  redis.call('PEXPIRE', tokensKey, 120000)
  redis.call('PEXPIRE', timestampKey, 120000)
  local deficit = requested - tokens
  local waitMs = math.ceil(deficit / refillRate)
  if waitMs < 0 then
    waitMs = 0
  end
  return {0, tokens, waitMs}
end

local remaining = tokens - requested
redis.call('SET', tokensKey, remaining)
redis.call('SET', timestampKey, now)
redis.call('PEXPIRE', tokensKey, 120000)
redis.call('PEXPIRE', timestampKey, 120000)
return {1, remaining, 0}
`;

export class RateLimitExceededError extends Error {
  public readonly scope: RateLimitScope;
  public readonly scopeId: string;
  public readonly retryInMs: number;
  public readonly remaining: number;

  constructor(message: string, result: RateLimitCheck) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.scope = result.scope;
    this.scopeId = result.scopeId;
    this.retryInMs = result.retryInMs;
    this.remaining = result.remaining;
  }
}

export class IngestionRateLimiter {
  private redis: Redis;
  private logger: pino.Logger;
  private defaultConfig: RateLimitConfig;
  private configCache = new Map<string, { expiresAt: number; config: RateLimitConfig }>();

  constructor(redis: Redis, logger: pino.Logger, defaultConfig?: RateLimitConfig) {
    this.redis = redis;
    this.logger = logger.child({ module: 'IngestionRateLimiter' });
    const maxPerMinute = Number(process.env.INGESTION_RATE_LIMIT_PER_MINUTE || '600');
    const burst = Number(process.env.INGESTION_RATE_LIMIT_BURST || '1200');
    this.defaultConfig = defaultConfig ?? {
      maxPerMinute: maxPerMinute > 0 ? maxPerMinute : 600,
      burst: burst > 0 ? burst : 1200,
    };
  }

  async ensureWithinLimit(options: EnsureWithinLimitOptions): Promise<void> {
    if (!options.tokens || options.tokens <= 0) {
      return;
    }

    const scopes: Array<{ scope: RateLimitScope; scopeId: string }> = [];
    if (options.tenantId) {
      scopes.push({ scope: 'tenant', scopeId: options.tenantId });
    }
    if (options.userId) {
      scopes.push({ scope: 'user', scopeId: options.userId });
    }

    if (scopes.length === 0) {
      scopes.push({ scope: 'tenant', scopeId: DEFAULT_SCOPE });
    }

    for (const scope of scopes) {
      const result = await this.consume(scope.scope, scope.scopeId, options.tokens);
      if (!result.allowed) {
        this.logger.warn(
          {
            scope: scope.scope,
            scopeId: scope.scopeId,
            tokens: options.tokens,
            retryInMs: result.retryInMs,
            remaining: result.remaining,
            metadata: options.metadata,
          },
          'Ingestion rate limit exceeded',
        );
        throw new RateLimitExceededError(
          `Ingestion rate limit exceeded for ${scope.scope}:${scope.scopeId}`,
          result,
        );
      }
    }
  }

  private async consume(scope: RateLimitScope, scopeId: string, tokens: number): Promise<RateLimitCheck> {
    const config = await this.getConfig(scope, scopeId);
    const keyBase = `${STATE_PREFIX}:${scope}:${scopeId}`;
    const now = Date.now();
    const refillRate = config.maxPerMinute / 60000;
    const capacity = Math.max(config.burst, config.maxPerMinute);

    const [allowedRaw, remainingRaw, retryRaw] = (await this.redis.eval(
      TOKEN_BUCKET_LUA,
      2,
      `${keyBase}:tokens`,
      `${keyBase}:ts`,
      now,
      refillRate,
      capacity,
      tokens,
    )) as [number | string, number | string, number | string];

    const allowed = Number(allowedRaw) === 1;
    const remaining = Number(remainingRaw) || 0;
    const retryInMs = Number(retryRaw) || 0;

    return {
      allowed,
      remaining,
      retryInMs,
      scope,
      scopeId,
      config,
    };
  }

  private async getConfig(scope: RateLimitScope, scopeId: string): Promise<RateLimitConfig> {
    const cacheKey = `${scope}:${scopeId}`;
    const cached = this.configCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.config;
    }

    const redisKey = `${CONFIG_PREFIX}:${scope}:${scopeId}`;
    const raw = await this.redis.get(redisKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RateLimitConfig;
        const validated = this.normalizeConfig(parsed);
        this.configCache.set(cacheKey, { config: validated, expiresAt: now + 15000 });
        return validated;
      } catch (error) {
        this.logger.warn(
          { scope, scopeId, error },
          'Failed to parse rate limit config, falling back to defaults',
        );
      }
    }

    const defaultRaw = await this.redis.get(`${CONFIG_PREFIX}:${DEFAULT_SCOPE}`);
    if (defaultRaw) {
      try {
        const parsed = JSON.parse(defaultRaw) as RateLimitConfig;
        const validated = this.normalizeConfig(parsed);
        this.configCache.set(cacheKey, { config: validated, expiresAt: now + 15000 });
        return validated;
      } catch (error) {
        this.logger.warn({ error }, 'Failed to parse default ingestion rate limit config');
      }
    }

    this.configCache.set(cacheKey, { config: this.defaultConfig, expiresAt: now + 15000 });
    return this.defaultConfig;
  }

  private normalizeConfig(config: RateLimitConfig): RateLimitConfig {
    const maxPerMinute = Number(config.maxPerMinute);
    const burst = Number(config.burst);
    return {
      maxPerMinute: Number.isFinite(maxPerMinute) && maxPerMinute > 0 ? maxPerMinute : this.defaultConfig.maxPerMinute,
      burst: Number.isFinite(burst) && burst > 0 ? burst : Math.max(this.defaultConfig.burst, this.defaultConfig.maxPerMinute),
    };
  }

  async preloadDefaults(defaultConfig: RateLimitConfig): Promise<void> {
    this.defaultConfig = this.normalizeConfig(defaultConfig);
    this.configCache.clear();
  }
}

export const RATE_LIMIT_CONFIG_PREFIX = CONFIG_PREFIX;
export const RATE_LIMIT_STATE_PREFIX = STATE_PREFIX;
