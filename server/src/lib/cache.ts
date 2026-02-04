import { RedisService } from '../cache/redis.js';
import pino from 'pino';

const logger = (pino as any)();

// Simple metrics for cache (Placeholders for now, can be connected to Prom/Telemetry)
const metrics = {
  cacheHit: { inc: () => {} },
  cacheMiss: { inc: () => {} },
  cacheEviction: { inc: () => {} },
};

export const cached =
  <T>(key: string, ttl: number, fn: () => Promise<T>) => async (): Promise<T> => {
    const redis = RedisService.getInstance();

    try {
      const hit = await redis.get(key);
      if (hit) {
        metrics.cacheHit.inc();
        return JSON.parse(hit) as T;
      }
    } catch (err) {
      logger.warn({ err, key }, 'Redis get failed in cached wrapper');
    }

    const val = await fn();

    try {
      await redis.setex(key, ttl, JSON.stringify(val));
      metrics.cacheMiss.inc();
    } catch (err) {
      logger.warn({ err, key }, 'Redis setex failed in cached wrapper');
    }

    return val;
  };
