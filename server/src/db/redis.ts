// @ts-nocheck
import Redis, { Cluster } from 'ioredis';
import * as dotenv from 'dotenv';
import pino from 'pino';
import config from '../config/index.js';
import { RedisService } from '../cache/redis.js';

dotenv.config();

const logger = (pino as any)();

// Validate production security
if (
  process.env.NODE_ENV === 'production' &&
  config.redis.password === 'devpassword'
) {
  throw new Error(
    'Security Error: REDIS_PASSWORD must be set and cannot be "devpassword" in production',
  );
}

import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

let redisClient: Redis | Cluster;

export function getRedisClient(): Redis | Cluster {
  if (!redisClient) {
    try {
      // Use RedisService from cache module to handle connection logic including clustering
      const redisService = new RedisService({
        url: `redis://${config.redis.host}:${config.redis.port}`,
        clusterNodes: config.redis.clusterNodes
      });

      redisClient = redisService.getClient() as Redis | Cluster;

      // Attach event listeners (ioredis clients emit events)
      (redisClient as any).on('connect', () => logger.info('Redis client connected.'));
      (redisClient as any).on('error', (err: any) => {
        logger.warn(
          `Redis connection failed - using mock responses. Error: ${err.message}`,
        );
        redisClient = createMockRedisClient() as any;
      });

      // Wrap methods for telemetry
      const originalGet = redisClient.get.bind(redisClient);
      redisClient.get = async (key: string) => {
        const value = await originalGet(key);
        if (value) {
          telemetry.subsystems.cache.hits.add(1);
        } else {
          telemetry.subsystems.cache.misses.add(1);
        }
        return value;
      };

      const originalSet = redisClient.set.bind(redisClient);
      redisClient.set = async (key: string, value: string, ...args: any[]) => {
        telemetry.subsystems.cache.sets.add(1);
        return await originalSet(key, value, ...args);
      };

      const originalDel = redisClient.del.bind(redisClient);
      redisClient.del = (async (...keys: string[]) => {
        telemetry.subsystems.cache.dels.add(1);
        return await originalDel(...keys);
      }) as any;
    } catch (error: any) {
      logger.warn(
        `Redis initialization failed - using development mode. Error: ${(error as Error).message}`,
      );
      redisClient = createMockRedisClient() as any;
    }
  }
  return redisClient;
}

function createMockRedisClient() {
  return {
    get: async (key: string) => {
      logger.debug(`Mock Redis GET: Key: ${key}`);
      return null;
    },
    set: async (key: string, value: string, ...args: any[]) => {
      logger.debug(`Mock Redis SET: Key: ${key}, Value: ${value}`);
      return 'OK';
    },
    del: async (...keys: string[]) => {
      logger.debug(`Mock Redis DEL: Keys: ${keys.join(', ')}`);
      return keys.length;
    },
    exists: async (...keys: string[]) => {
      logger.debug(`Mock Redis EXISTS: Keys: ${keys.join(', ')}`);
      return 0;
    },
    expire: async (key: string, seconds: number) => {
      logger.debug(`Mock Redis EXPIRE: Key: ${key}, Seconds: ${seconds}`);
      return 1;
    },
    quit: async () => { },
    on: () => { },
    connect: async () => { },
    options: { keyPrefix: 'summit:' },
    duplicate: () => createMockRedisClient(),
  };
}

export async function redisHealthCheck(): Promise<boolean> {
  if (!redisClient) return false;
  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed.');
    redisClient = null as any; // Clear the client instance
  }
}
