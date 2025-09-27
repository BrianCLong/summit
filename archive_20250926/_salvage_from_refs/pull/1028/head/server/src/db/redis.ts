import Redis from 'ioredis';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'devpassword';

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
        logger.warn('Redis connection failed - using mock responses', { error: err.message });
        redisClient = createMockRedisClient() as Redis;
      });
      
    } catch (error) {
      logger.warn('Redis initialization failed - using development mode', { error: (error as Error).message });
      redisClient = createMockRedisClient() as Redis;
    }
  }
  return redisClient;
}

function createMockRedisClient() {
  return {
    get: async (key: string) => {
      logger.debug('Mock Redis GET:', { key });
      return null;
    },
    set: async (key: string, value: string, ...args: any[]) => {
      logger.debug('Mock Redis SET:', { key, value });
      return 'OK';
    },
    del: async (...keys: string[]) => {
      logger.debug('Mock Redis DEL:', { keys });
      return keys.length;
    },
    exists: async (...keys: string[]) => {
      logger.debug('Mock Redis EXISTS:', { keys });
      return 0;
    },
    expire: async (key: string, seconds: number) => {
      logger.debug('Mock Redis EXPIRE:', { key, seconds });
      return 1;
    },
    quit: async () => {},
    on: () => {},
    connect: async () => {}
  };
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed.');
    redisClient = null; // Clear the client instance
  }
}