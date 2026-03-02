// @ts-nocheck
import { RedisService } from './redis.js';
import { safeJsonParse, safeJsonStringify } from '../utils/safe-json.js';

const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T> {
  const r = RedisService.getInstance();
  const cachedVal = await r.get(key);
  if (cachedVal) return safeJsonParse<T>(cachedVal);

  // Dogpile protection: check if request is already in flight locally
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;

  const p = (async (): Promise<T> => {
    const v = await fn();
    await r.set(key, safeJsonStringify(v), ttlSec);
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
): Promise<T> {
  const r = RedisService.getInstance();
  const v = await r.get(key);

  if (v) {
    const t = await r.ttl(key);
    // If within stale window (ttl < swr remaining), refresh in background
    if (t > 0 && t < swr) {
       fn()
        .then((n) => r.set(key, JSON.stringify(n), ttl))
        .catch(() => {});
    }
    return JSON.parse(v) as T;
  }

  return cached(key, ttl, fn);
}
