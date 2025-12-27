import { getRedisClient } from '../db/redis.js';
import crypto from 'crypto';

class PersistedQueryService {
  private static instance: PersistedQueryService;
  private cache: Map<string, { query: string; hits: number; lastUsed: number }>;
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly REDIS_PREFIX = 'pq:';

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): PersistedQueryService {
    if (!PersistedQueryService.instance) {
      PersistedQueryService.instance = new PersistedQueryService();
    }
    return PersistedQueryService.instance;
  }

  public async register(id: string, sha256: string, sdl: string): Promise<boolean> {
    const computedHash = crypto.createHash('sha256').update(sdl).digest('hex');
    if (computedHash !== sha256) {
        throw new Error('Hash mismatch: The provided SHA256 does not match the SDL content.');
    }

    // In strict APQ, ID is usually the hash. But we support custom IDs too.

    const redis = getRedisClient();
    await redis.set(`${this.REDIS_PREFIX}${id}`, sdl);
    this.addToCache(id, sdl);
    return true;
  }

  public async get(id: string): Promise<string | null> {
    // Check memory cache
    if (this.cache.has(id)) {
      const item = this.cache.get(id)!;
      item.hits++;
      item.lastUsed = Date.now();
      return item.query;
    }

    // Check Redis
    const redis = getRedisClient();
    const query = await redis.get(`${this.REDIS_PREFIX}${id}`);

    if (query) {
      this.addToCache(id, query);
      return query;
    }

    return null;
  }

  private addToCache(id: string, query: string) {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLFU();
    }
    this.cache.set(id, { query, hits: 1, lastUsed: Date.now() });
  }

  private evictLFU() {
    let lfuId: string | null = null;
    let minHits = Infinity;
    let oldest = Infinity;

    for (const [id, item] of this.cache.entries()) {
      if (item.hits < minHits) {
        minHits = item.hits;
        oldest = item.lastUsed;
        lfuId = id;
      } else if (item.hits === minHits && item.lastUsed < oldest) {
        oldest = item.lastUsed;
        lfuId = id;
      }
    }

    if (lfuId) {
      this.cache.delete(lfuId);
    }
  }
}

export const persistedQueryService = PersistedQueryService.getInstance();
