import type Redis from 'ioredis';
import type { Logger } from 'pino';
import type { NeighborhoodResult } from '../utils/mappers.js';
import type { CachedNeighborhoodPayload } from '../types.js';

export interface NeighborhoodCacheOptions {
  ttlSeconds: number;
  logger: Logger;
}

export class NeighborhoodCache {
  private readonly client: Redis | null;
  private readonly ttlSeconds: number;
  private readonly logger: Logger;

  constructor(client: Redis | null, options: NeighborhoodCacheOptions) {
    this.client = client;
    this.ttlSeconds = options.ttlSeconds;
    this.logger = options.logger;
  }

  async get(key: string): Promise<CachedNeighborhoodPayload | null> {
    if (!this.client) {
      return null;
    }
    try {
      const raw = await this.client.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as CachedNeighborhoodPayload;
    } catch (error) {
      this.logger.warn({ err: error, key }, 'redis_cache_get_error');
      return null;
    }
  }

  async set(key: string, value: CachedNeighborhoodPayload): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', this.ttlSeconds);
    } catch (error) {
      this.logger.warn({ err: error, key }, 'redis_cache_set_error');
    }
  }

  buildKey(nodeId: string, direction: string, limit: number, cursor: string | null): string {
    const cursorKey = cursor ?? '0';
    return `neighborhood:${nodeId}:${direction}:${limit}:${cursorKey}`;
  }

  toPayload(result: NeighborhoodResult): CachedNeighborhoodPayload {
    return { result };
  }
}

export type NeighborhoodCacheFactory = NeighborhoodCache;
