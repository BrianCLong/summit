import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';
import type { CacheInvalidationMessage } from '../types/index.js';

// Handle ESM/CJS interop for ioredis
type RedisClient = IORedis.Redis;
type RedisOptions = IORedis.RedisOptions;

// Create a properly typed constructor reference
const Redis = IORedis as unknown as new (options?: RedisOptions) => RedisClient;

const log = logger.child({ module: 'redis' });

let redisClient: RedisClient | null = null;
let subscriberClient: RedisClient | null = null;

const CONFIG_CACHE_PREFIX = 'config:';
const FLAG_CACHE_PREFIX = 'flag:';
const EXPERIMENT_CACHE_PREFIX = 'exp:';
const SEGMENT_CACHE_PREFIX = 'seg:';
const INVALIDATION_CHANNEL = 'config-service:invalidation';

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

function getDefaultConfig(): RedisConfig {
  return {
    host: process.env.CONFIG_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(
      process.env.CONFIG_REDIS_PORT || process.env.REDIS_PORT || '6379',
      10,
    ),
    password:
      process.env.CONFIG_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.CONFIG_REDIS_DB || '0', 10),
    keyPrefix: process.env.CONFIG_REDIS_PREFIX || 'cfg:',
  };
}

export function initializeRedis(config?: Partial<RedisConfig>): RedisClient {
  if (redisClient) {
    return redisClient;
  }

  const fullConfig = { ...getDefaultConfig(), ...config };

  redisClient = new Redis({
    host: fullConfig.host,
    port: fullConfig.port,
    password: fullConfig.password,
    db: fullConfig.db,
    keyPrefix: fullConfig.keyPrefix,
    connectTimeout: 5000,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        log.warn({ times }, 'Redis connection failed, giving up');
        return null;
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on('connect', () => log.info('Redis client connected'));
  redisClient.on('error', (err) => log.error({ err }, 'Redis client error'));
  redisClient.on('close', () => log.warn('Redis connection closed'));

  return redisClient;
}

export function getRedis(): RedisClient {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    log.info('Redis client closed');
  }
}

// Cache key builders
export function configCacheKey(
  key: string,
  tenantId?: string | null,
  environment?: string | null,
  userId?: string | null,
): string {
  const parts = [CONFIG_CACHE_PREFIX, key];
  if (environment) parts.push(`env:${environment}`);
  if (tenantId) parts.push(`t:${tenantId}`);
  if (userId) parts.push(`u:${userId}`);
  return parts.join(':');
}

export function flagCacheKey(key: string, tenantId?: string | null): string {
  return tenantId
    ? `${FLAG_CACHE_PREFIX}${key}:t:${tenantId}`
    : `${FLAG_CACHE_PREFIX}${key}`;
}

export function experimentCacheKey(
  key: string,
  tenantId?: string | null,
): string {
  return tenantId
    ? `${EXPERIMENT_CACHE_PREFIX}${key}:t:${tenantId}`
    : `${EXPERIMENT_CACHE_PREFIX}${key}`;
}

export function segmentCacheKey(id: string): string {
  return `${SEGMENT_CACHE_PREFIX}${id}`;
}

// Cache operations
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    log.warn({ err, key }, 'Cache get failed');
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    log.warn({ err, key }, 'Cache set failed');
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (err) {
    log.warn({ err, key }, 'Cache delete failed');
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    const fullPattern = (redis.options.keyPrefix || '') + pattern;
    const keys = await redis.keys(fullPattern);
    if (keys.length > 0) {
      // Strip prefix since del will add it
      const strippedKeys = keys.map((k) =>
        k.replace(redis.options.keyPrefix || '', ''),
      );
      await redis.del(...strippedKeys);
      log.debug({ pattern, count: keys.length }, 'Cache pattern deleted');
    }
  } catch (err) {
    log.warn({ err, pattern }, 'Cache pattern delete failed');
  }
}

// Cache invalidation pub/sub
export async function publishInvalidation(
  message: CacheInvalidationMessage,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.publish(INVALIDATION_CHANNEL, JSON.stringify(message));
    log.debug({ message }, 'Published cache invalidation');
  } catch (err) {
    log.warn({ err }, 'Failed to publish cache invalidation');
  }
}

export async function subscribeToInvalidations(
  handler: (message: CacheInvalidationMessage) => void,
): Promise<void> {
  if (subscriberClient) {
    log.warn('Already subscribed to invalidations');
    return;
  }

  const config = getDefaultConfig();
  subscriberClient = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  subscriberClient.on('error', (err) =>
    log.error({ err }, 'Redis subscriber error'),
  );

  await subscriberClient.subscribe(INVALIDATION_CHANNEL);

  subscriberClient.on('message', (channel, message) => {
    if (channel === INVALIDATION_CHANNEL) {
      try {
        const parsed = JSON.parse(message) as CacheInvalidationMessage;
        handler(parsed);
      } catch (err) {
        log.warn({ err, message }, 'Failed to parse invalidation message');
      }
    }
  });

  log.info('Subscribed to cache invalidation channel');
}

export async function healthCheck(): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
