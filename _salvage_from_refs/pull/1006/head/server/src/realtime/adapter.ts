import { createAdapter as redisAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from '../db/redis.js';

export function createAdapter() {
  const pub = getRedisClient();
  const sub = pub.duplicate();
  return redisAdapter(pub, sub);
}
