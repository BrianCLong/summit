// @ts-nocheck
import { createCacheClient } from '@packages/cache';

const answersCache = createCacheClient({
  namespace: 'answers',
  cacheClass: 'critical_path',
  redisUrls: process.env.REDIS_URLS ? process.env.REDIS_URLS.split(',') : (process.env.REDIS_URL ? [process.env.REDIS_URL] : undefined),
  defaultTTLSeconds: 60,
});

function cacheKey(tenant: string, input: string) {
  return `ans:${tenant}:${Buffer.from(input).toString('base64url')}`;
}

export async function getCached(tenant: string, input: string) {
  return answersCache.get<string>(cacheKey(tenant, input));
}

export async function setCached(
  tenant: string,
  input: string,
  text: string,
  ttl = 60,
) {
  await answersCache.set(cacheKey(tenant, input), text, { ttlSeconds: ttl });
}
