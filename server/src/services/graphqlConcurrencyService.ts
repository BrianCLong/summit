import type { Redis } from 'ioredis';
import { getRedisClient } from '../db/redis.js';
import baseLogger from '../config/logger';

export interface GraphQLConcurrencyConfig {
  defaultLimit?: number;
  ttlSeconds?: number;
}

export interface GraphQLConcurrencyServiceOptions extends GraphQLConcurrencyConfig {
  redis?: Redis;
}

export interface ConcurrencyAcquisition {
  allowed: boolean;
  limit: number;
  active: number;
}

const LIMIT_KEY_PREFIX = 'graphql:throttle:limit';
const DEFAULT_LIMIT_KEY = `${LIMIT_KEY_PREFIX}:default`;
const ACTIVE_KEY_PREFIX = 'graphql:throttle:active';

const logger = baseLogger.child({ name: 'graphql-concurrency-service' });

export class GraphQLConcurrencyService {
  private readonly redis: Redis;
  private readonly defaultLimit: number;
  private readonly ttlSeconds: number;

  constructor(options: GraphQLConcurrencyServiceOptions = {}) {
    this.redis = options.redis ?? getRedisClient();
    this.defaultLimit = options.defaultLimit ?? parseInt(process.env.GRAPHQL_CONCURRENCY_DEFAULT_LIMIT || '5', 10);
    this.ttlSeconds = options.ttlSeconds ?? parseInt(process.env.GRAPHQL_CONCURRENCY_TTL_SECONDS || '120', 10);
  }

  async acquire(userId: string): Promise<ConcurrencyAcquisition> {
    const limit = await this.getEffectiveLimit(userId);
    const activeKey = this.getActiveKey(userId);

    try {
      const active = await this.redis.incr(activeKey);
      await this.applyTtl(activeKey);

      if (active > limit) {
        const fallback = await this.redis.decr(activeKey);
        if (fallback <= 0) {
          await this.redis.del(activeKey);
        } else {
          await this.applyTtl(activeKey);
        }
        return { allowed: false, limit, active: limit };
      }

      return { allowed: true, limit, active };
    } catch (error) {
      logger.warn({ error }, 'Failed to acquire GraphQL concurrency slot');
      return { allowed: true, limit, active: 0 };
    }
  }

  async release(userId: string): Promise<number> {
    const activeKey = this.getActiveKey(userId);

    try {
      const remaining = await this.redis.decr(activeKey);
      if (remaining <= 0) {
        await this.redis.del(activeKey);
        return 0;
      }
      await this.applyTtl(activeKey);
      return remaining;
    } catch (error) {
      logger.debug({ error }, 'Failed to release GraphQL concurrency slot');
      await this.redis.del(activeKey).catch(() => {});
      return 0;
    }
  }

  async getEffectiveLimit(userId: string): Promise<number> {
    const override = await this.getUserLimitOverride(userId);
    if (override !== null) {
      return override;
    }
    return this.getDefaultLimit();
  }

  async getDefaultLimit(): Promise<number> {
    const stored = await this.redis.get(DEFAULT_LIMIT_KEY);
    const limit = stored ? Number.parseInt(stored, 10) : this.defaultLimit;
    return Number.isFinite(limit) && limit > 0 ? limit : this.defaultLimit;
  }

  async setDefaultLimit(limit: number): Promise<void> {
    await this.redis.set(DEFAULT_LIMIT_KEY, limit.toString());
  }

  async getUserLimitOverride(userId: string): Promise<number | null> {
    const limit = await this.redis.get(this.getLimitKey(userId));
    if (limit === null) {
      return null;
    }
    const value = Number.parseInt(limit, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  async setUserLimit(userId: string, limit: number): Promise<void> {
    await this.redis.set(this.getLimitKey(userId), limit.toString());
  }

  async clearUserLimit(userId: string): Promise<void> {
    await this.redis.del(this.getLimitKey(userId));
  }

  async getActiveCount(userId: string): Promise<number> {
    const active = await this.redis.get(this.getActiveKey(userId));
    if (!active) {
      return 0;
    }
    const value = Number.parseInt(active, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  private getLimitKey(userId: string): string {
    return `${LIMIT_KEY_PREFIX}:${userId}`;
  }

  private getActiveKey(userId: string): string {
    return `${ACTIVE_KEY_PREFIX}:${userId}`;
  }

  private async applyTtl(key: string): Promise<void> {
    if (this.ttlSeconds > 0) {
      await this.redis.expire(key, this.ttlSeconds).catch(() => {});
    }
  }
}

export default GraphQLConcurrencyService;
