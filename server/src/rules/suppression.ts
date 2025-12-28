// Using Redis for suppression list
import type { Redis } from 'ioredis';
import { getRedisClient } from '../db/redis.js';

let redis: Redis | null = null;
try {
  redis = getRedisClient();
} catch (e) {
  // console.error("Failed to get redis client for suppression", e);
}

export async function suppressEntity(entityId: string, durationMs: number) {
  if (!redis) return; // Fail safe
  const key = `suppress:${entityId}`;
  await redis.set(key, '1', 'PX', durationMs);
}

export async function isSuppressed(entityId: string): Promise<boolean> {
  if (!redis) return false;
  const exists = await redis.exists(`suppress:${entityId}`);
  return exists === 1;
}
