import config from '../config/index.js';
import { getRedisClient } from '../config/database.js';
import {
  cacheHits,
  cacheMisses,
  cacheSets,
  cacheInvalidations,
  cacheLocalSize,
} from '../metrics/cacheMetrics.js';
import { getWarmerStats } from './warmers.js';
import { getLocalCacheStats } from './responseCache.js';

function sumMetric(metric: any): number {
  if (!metric?.values?.length) return 0;
  return metric.values.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
}

async function getRedisInfo() {
  const client: any = getRedisClient();
  if (!client) {
    return { connected: false, mode: 'disabled' };
  }

  try {
    const info = await client.info?.();
    const parsed: Record<string, string> = {};
    if (typeof info === 'string') {
      info.split('\n').forEach((line) => {
        const [k, v] = line.split(':');
        if (k && v) parsed[k] = v.trim();
      });
    }
    return {
      connected: true,
      mode: config.redis.useCluster || config.redis.clusterNodes.length ? 'cluster' : 'single',
      usedMemory: parsed.used_memory ? Number(parsed.used_memory) : undefined,
      connectedClients: parsed.connected_clients
        ? Number(parsed.connected_clients)
        : undefined,
    };
  } catch (error) {
    return {
      connected: true,
      mode: config.redis.useCluster ? 'cluster' : 'single',
      error: (error as Error).message,
    };
  }
}

export async function collectCacheAnalytics() {
  const hits = sumMetric(cacheHits.get());
  const misses = sumMetric(cacheMisses.get());
  const sets = sumMetric(cacheSets.get());
  const invalidations = sumMetric(cacheInvalidations.get());
  const localEntries = sumMetric(cacheLocalSize.get());
  const total = hits + misses;
  const hitRate = total === 0 ? 0 : hits / total;

  return {
    config: {
      cache: config.cache,
      cdn: config.cdn,
    },
    metrics: {
      hits,
      misses,
      sets,
      invalidations,
      hitRate,
      localEntries,
    },
    redis: await getRedisInfo(),
    warmers: getWarmerStats(),
    localCache: getLocalCacheStats(),
  };
}
