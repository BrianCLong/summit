// @ts-nocheck
import Redis from 'ioredis';
import { instrumentRedisClient } from '../observability/redis-instrumentation.js';
import * as dotenv from 'dotenv';
// @ts-ignore
import { default as pino } from 'pino';

dotenv.config();

// @ts-ignore
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
      const rawClient = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        connectTimeout: 5000,
        lazyConnect: true,
      });

      redisClient = instrumentRedisClient(rawClient);

      redisClient.on('connect', () => logger.info('Redis client connected.'));
      redisClient.on('error', (err) => {
        logger.warn(
          `Redis connection failed - using mock responses. Error: ${err.message}`,
        );
        redisClient = createMockRedisClient() as any;
      });

      // Original manual telemetry hooks removed in favor of instrumentation
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
    quit: async () => { },
    on: () => { },
    connect: async () => { },
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
    redisClient = null; // Clear the client instance
  }
}
