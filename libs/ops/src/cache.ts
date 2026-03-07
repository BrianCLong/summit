import Redis from "ioredis";
import { cacheHits, cacheMiss } from "./metrics-queue.js";

type CachePrimitive = string | number | boolean | Record<string, unknown> | Array<unknown> | null;

export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  del(keys: string[]): Promise<number>;
  quit?(): Promise<void>;
}

function buildRedisClient(): CacheAdapter | null {
  const enabled = process.env.FLAG_SCALE_REDIS === "1";
  if (!enabled) {
    return null;
  }

  const address = process.env.REDIS_ADDR;
  if (!address) {
    console.warn("cache_disabled_no_address");
    return null;
  }

  return new Redis(address, { password: process.env.REDIS_PASS });
}

export class CacheManager {
  constructor(private readonly client: CacheAdapter | null) {}

  async remember<T extends CachePrimitive>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>
  ): Promise<T> {
    if (!this.client) {
      return factory();
    }

    if (ttlSeconds <= 0) {
      throw new Error("cache_ttl_must_be_positive");
    }

    const cached = await this.client.get(key);
    if (cached !== null) {
      try {
        cacheHits.inc();
        return JSON.parse(cached) as T;
      } catch (err) {
        console.warn("cache_deserialize_failed", err);
        await this.client.del([key]);
      }
    }

    cacheMiss.inc();
    const computed = await factory();
    await this.client.setex(key, ttlSeconds, JSON.stringify(computed));
    return computed;
  }

  async bust(prefix: string): Promise<void> {
    if (!this.client) {
      return;
    }

    const keys = await this.client.keys(`${prefix}:*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async shutdown(): Promise<void> {
    if (this.client?.quit) {
      await this.client.quit();
    }
  }
}

const defaultCache = new CacheManager(buildRedisClient());

export const cacheRemember = defaultCache.remember.bind(defaultCache);
export const cacheBust = defaultCache.bust.bind(defaultCache);
export const closeCache = defaultCache.shutdown.bind(defaultCache);
