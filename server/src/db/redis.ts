import Redis from 'ioredis';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger: pino.Logger = pino();

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.REDIS_PASSWORD || process.env.REDIS_PASSWORD === 'devpassword')
) {
  throw new Error(
    'Security Error: REDIS_PASSWORD must be set and cannot be "devpassword" in production',
  );
}
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'devpassword';

let redisClient: Redis;

import { telemetry } from '../lib/telemetry/comprehensive-telemetry';

export function getRedisClient(): Redis {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        connectTimeout: 5000,
        lazyConnect: true,
      });

      redisClient.on('connect', () => logger.info('Redis client connected.'));
      redisClient.on('error', (err) => {
        logger.warn(
          `Redis connection failed - using mock responses. Error: ${err.message}`,
        );
        redisClient = createMockRedisClient() as any;
      });

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
      redisClient.set = async (key: string, value: string) => {
        telemetry.subsystems.cache.sets.add(1);
        return await originalSet(key, value);
      };

      const originalDel = redisClient.del.bind(redisClient);
      redisClient.del = async (key: string) => {
        telemetry.subsystems.cache.dels.add(1);
        return await originalDel(key);
      };
    } catch (error) {
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
    quit: async () => {},
    on: () => {},
    connect: async () => {},
  };
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed.');
    redisClient = null; // Clear the client instance
  }
}
