import crypto from 'node:crypto';
import { getRedisClient } from '../cache/index.js';
import { safeJsonParse, safeJsonStringify } from '../utils/safe-json.js';

export interface AnalyticsSelection {
  nodes: string[];
  edges: string[];
}

export function signatureForSelection(selection: AnalyticsSelection): string {
  const nodes = [...selection.nodes].sort().join('|');
  const edges = [...selection.edges].sort().join('|');
  return crypto
    .createHash('sha256')
    .update(`${nodes}::${edges}`)
    .digest('hex');
}

export async function getCachedSnapshot<T>(sig: string): Promise<T | null> {
  const redis = getRedisClient();
  const key = `analytics:${sig}`;
  const value = await redis.get(key);
  return value ? safeJsonParse<T>(value) : null;
}

export async function setCachedSnapshot<T>(
  sig: string,
  value: T,
  ttlSec = 3600,
): Promise<void> {
  const redis = getRedisClient();
  const key = `analytics:${sig}`;
  await redis.setEx(key, ttlSec, safeJsonStringify(value));
}
