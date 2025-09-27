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
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
    });
    redisClient.on('connect', () => logger.info('Redis client connected.'));
    redisClient.on('error', (err) => logger.error({ err }, 'Redis client error.'));
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed.');
    redisClient = null; // Clear the client instance
  }
}