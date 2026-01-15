import Redis from 'ioredis';
import { Logger } from '../Logger.js';

export interface StateStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  increment(key: string, by?: number): Promise<number>;
}

export class InMemoryStateStore implements StateStore {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, value);
    // InMemory TTL not implemented for brevity
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const current = parseInt(this.store.get(key) || '0', 10);
    const newVal = current + by;
    this.store.set(key, newVal.toString());
    return newVal;
  }
}

export class RedisStateStore implements StateStore {
  private redis: Redis;
  private logger = new Logger('RedisStateStore');

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.redis = new (Redis as any)(redisUrl, {
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });
  }

  async connect() {
    try {
      await this.redis.connect();
    } catch (e: any) {
      this.logger.error('Failed to connect to Redis', e);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    return this.redis.incrby(key, by);
  }
}
