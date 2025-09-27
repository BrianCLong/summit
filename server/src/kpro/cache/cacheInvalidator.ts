import type Redis from 'ioredis';

export interface CacheInvalidator {
  readonly name: string;
  invalidate(keys: string[]): Promise<void>;
}

export class RedisCacheInvalidator implements CacheInvalidator {
  readonly name = 'redis';
  private namespace: string;
  private redis: Redis;

  constructor(redis: Redis, namespace = 'kpro') {
    this.redis = redis;
    this.namespace = namespace;
  }

  async invalidate(keys: string[]): Promise<void> {
    if (!keys.length) return;
    const namespaced = keys.map((key) => `${this.namespace}:${key}`);
    await this.redis.del(...namespaced);
  }
}

export class InMemoryCacheInvalidator implements CacheInvalidator {
  readonly name = 'in-memory';
  private store: Map<string, any>;

  constructor(store?: Map<string, any>) {
    this.store = store ?? new Map();
  }

  async invalidate(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.store.delete(key);
    }
  }
}
