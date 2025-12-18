import { createClient } from 'redis';

// Lazy init
let redisClient: ReturnType<typeof createClient> | null = null;

function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.connect().catch(console.error);
  }
  return redisClient;
}

const inflight = new Map<string, Promise<any>>();

export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T> {
  const r = getRedis();
  const cachedVal = await r.get(key);
  if (cachedVal) return JSON.parse(cachedVal);

  // Dogpile protection: check if request is already in flight locally
  if (inflight.has(key)) return inflight.get(key)! as Promise<T>;

  const p = (async () => {
    const v = await fn();
    await r.setEx(key, ttlSec, JSON.stringify(v));
    return v;
  })();

  inflight.set(key, p);

  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

export async function cachedSWR<T>(
  key: string,
  ttl: number,
  swr: number,
  fn: () => Promise<T>,
) {
  const r = getRedis();
  const v = await r.get(key);

  if (v) {
    const t = await r.ttl(key);
    // If within stale window (ttl < swr remaining), refresh in background
    if (t > 0 && t < swr) {
       fn()
        .then((n) => r.setEx(key, ttl, JSON.stringify(n)))
        .catch(() => {});
    }
    return JSON.parse(v);
  }

  return cached(key, ttl, fn);
}
