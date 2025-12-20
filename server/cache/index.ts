import { createClient } from 'redis';
const r = createClient({ url: process.env.REDIS_URL });
const inflight = new Map<string, Promise<any>>();
export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await r.get(key);
  if (cached) return JSON.parse(cached);
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
  const v = await r.get(key);
  if (v) {
    const t = await r.ttl(key);
    if (t > 0 && t < swr)
      fn()
        .then((n) => r.setEx(key, ttl, JSON.stringify(n)))
        .catch(() => {});
    return JSON.parse(v);
  }
  return cached(key, ttl, fn);
}
