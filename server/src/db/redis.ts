// @ts-nocheck
import { RedisService } from '../cache/redis.js';
import pino from 'pino';

const logger = (pino as any)();

// We no longer manage the client directly here, but delegate to RedisService
// to ensure a single singleton connection pool across the application.

export function getRedisClient() {
  return RedisService.getInstance().getClient();
}

export async function redisHealthCheck(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedisClient(): Promise<void> {
  await RedisService.getInstance().close();
  logger.info('Redis client closed (via RedisService).');
}
