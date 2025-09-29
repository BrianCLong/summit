import { createAdapter as redisAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export async function createAdapter() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const pub = createClient({ url });
  const sub = pub.duplicate();
  await Promise.all([pub.connect(), sub.connect()]);
  return redisAdapter(pub, sub);
}
