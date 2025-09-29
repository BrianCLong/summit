import crypto from 'crypto';
import { getRedisClient } from '../db/redis.js';

export function makeCacheKey(prefix: string, args: any, userId?: string) {
  const hash = crypto.createHash('sha1').update(JSON.stringify(args)).digest('hex');
  return `${prefix}:${userId || 'anon'}:${hash}`;
}

export async function getCached(key: string) {
  const redis = getRedisClient();
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: any, ttl: number) {
  const redis = getRedisClient();
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // ignore
  }
}
