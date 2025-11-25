import Redis from 'ioredis';
import type { CacheProvider } from '../types.js';

/**
 * Redis provider options
 */
export interface RedisProviderOptions {
  /** Redis URL (takes precedence) */
  url?: string;
  /** Host */
  host?: string;
  /** Port */
  port?: number;
  /** Password */
  password?: string;
  /** Database number */
  db?: number;
  /** Key prefix */
  keyPrefix?: string;
  /** Max retries per request */
  maxRetriesPerRequest?: number;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Enable offline queue */
  enableOfflineQueue?: boolean;
}

/**
 * Redis cache provider
 */
export class RedisProvider implements CacheProvider {
  readonly name = 'redis';
  private client: Redis;
  private keyPrefix: string;

  constructor(options: RedisProviderOptions = {}) {
    this.keyPrefix = options.keyPrefix ?? '';

    if (options.url) {
      this.client = new Redis(options.url, {
        maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
        connectTimeout: options.connectTimeout ?? 10000,
        enableOfflineQueue: options.enableOfflineQueue ?? true,
        lazyConnect: true,
      });
    } else {
      this.client = new Redis({
        host: options.host ?? 'localhost',
        port: options.port ?? 6379,
        password: options.password,
        db: options.db ?? 0,
        maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
        connectTimeout: options.connectTimeout ?? 10000,
        enableOfflineQueue: options.enableOfflineQueue ?? true,
        lazyConnect: true,
      });
    }

    // Handle errors
    this.client.on('error', (err) => {
      console.error('Redis error:', err.message);
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(this.prefixKey(key));
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const prefixedKey = this.prefixKey(key);

    if (ttl !== undefined && ttl > 0) {
      await this.client.setex(prefixedKey, ttl, serialized);
    } else {
      await this.client.set(prefixedKey, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(this.prefixKey(key));
    return result > 0;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(this.prefixKey(key));
    return result > 0;
  }

  async deletePattern(pattern: string): Promise<number> {
    const prefixedPattern = this.prefixKey(pattern);
    let cursor = '0';
    let count = 0;

    do {
      const [newCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        prefixedPattern,
        'COUNT',
        100
      );
      cursor = newCursor;

      if (keys.length > 0) {
        const deleted = await this.client.del(...keys);
        count += deleted;
      }
    } while (cursor !== '0');

    return count;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) {
      return [];
    }

    const prefixedKeys = keys.map(k => this.prefixKey(k));
    const values = await this.client.mget(...prefixedKeys);

    return values.map(v => {
      if (v === null) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    });
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const pipeline = this.client.pipeline();

    for (const entry of entries) {
      const prefixedKey = this.prefixKey(entry.key);
      const serialized = JSON.stringify(entry.value);

      if (entry.ttl !== undefined && entry.ttl > 0) {
        pipeline.setex(prefixedKey, entry.ttl, serialized);
      } else {
        pipeline.set(prefixedKey, serialized);
      }
    }

    await pipeline.exec();
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(this.prefixKey(key));
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Get underlying Redis client
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Add prefix to key
   */
  private prefixKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }
}
