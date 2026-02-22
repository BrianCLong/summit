import crypto from 'node:crypto';
import {
  getCachedJson,
  invalidateCache,
  setCachedJson,
  flushLocalCache,
} from '../cache/responseCache.js';
import {
  cacheBypassTotal,
  cacheLatencySeconds,
  recHit,
  recMiss,
  recSet,
} from '../metrics/cacheMetrics.js';

export interface GraphQueryCacheOptions {
  tenantId?: string;
  caseId?: string;
  permissionsHash?: string;
  ttlSeconds?: number;
}

export interface GraphQueryCacheContext extends GraphQueryCacheOptions {
  query: string;
  params: Record<string, unknown>;
  op?: string;
}

const DEFAULT_CACHE_TTL_SECONDS = parseInt(process.env.GRAPH_QUERY_CACHE_TTL || '15', 10);

export function normalizeQuery(query: string): string {
  return query.replace(/\s+/g, ' ').trim();
}

export function stableHash(input: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(input)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function buildGraphCacheKey(ctx: GraphQueryCacheContext) {
  const tenantId = ctx.tenantId || 'global';
  const caseId = ctx.caseId || 'global';
  const permissionsHash = ctx.permissionsHash || 'open';
  const normalizedQuery = normalizeQuery(ctx.query);
  const paramsHash = stableHash(ctx.params || {});

  const composite = `${tenantId}:${caseId}:${normalizedQuery}:${paramsHash}:${permissionsHash}`;
  const cacheKey = `graph:query:${crypto.createHash('sha256').update(composite).digest('hex')}`;

  const tags = [
    'graph:query',
    `graph:query:tenant:${tenantId}`,
    `graph:query:case:${tenantId}:${caseId}`,
    `graph:query:perm:${permissionsHash}`,
  ];

  return {
    cacheKey,
    tags,
    tenantId,
    caseId,
    permissionsHash,
    normalizedQuery,
    paramsHash,
  };
}

export async function runWithGraphQueryCache<T>(
  ctx: GraphQueryCacheContext,
  fetcher: () => Promise<T>,
): Promise<T> {
  const { cacheKey, tags, tenantId } = buildGraphCacheKey(ctx);
  const ttlSeconds = ctx.ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  const op = ctx.op || 'graph-query';
  const tenantLabel = tenantId || 'unknown';

  const start = Date.now();
  const cached = await getCachedJson<T>(cacheKey, { ttlSeconds });
  if (cached !== null) {
    recHit('graph-cache', op, tenantLabel);
  cacheLatencySeconds
    ?.labels?.(op, 'hit', tenantLabel)
    ?.observe?.((Date.now() - start) / 1000);
    return cached;
  }

  recMiss('graph-cache', op, tenantLabel);
  const fresh = await fetcher();
  await setCachedJson(cacheKey, fresh, { ttlSeconds, indexPrefixes: tags });
  recSet('graph-cache', op, tenantLabel);
  cacheLatencySeconds
    ?.labels?.(op, 'miss', tenantLabel)
    ?.observe?.((Date.now() - start) / 1000);
  return fresh;
}

export async function invalidateGraphQueryCache(options: {
  tenantId?: string;
  caseId?: string;
  permissionsHash?: string;
}) {
  const tenantId = options.tenantId || 'global';
  const caseId = options.caseId || 'global';
  const permissionsHash = options.permissionsHash;

  const tags = new Set<string>();
  tags.add('graph:query');
  tags.add(`graph:query:tenant:${tenantId}`);
  tags.add(`graph:query:case:${tenantId}:${caseId}`);
  if (permissionsHash) {
    tags.add(`graph:query:perm:${permissionsHash}`);
  }

  for (const tag of tags) {
    await invalidateCache(tag, tenantId);
  }
  flushLocalCache();
}

export function recordCacheBypass(reason: string, op: string, tenantId?: string) {
  cacheBypassTotal
    ?.labels?.(op, reason, tenantId || 'unknown')
    ?.inc?.();
}
