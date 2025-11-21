import Redis from 'ioredis';
import dotenv from 'dotenv';
import pino from 'pino';
import { configService } from '../config/ConfigService.js';

dotenv.config();

const logger: pino.Logger = pino();

const REDIS_HOST = configService.get('redis').host;
const REDIS_PORT = configService.get('redis').port;
const REDIS_PASSWORD = configService.get('redis').password;

let redisClient: Redis;

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
