// @ts-nocheck
import neo4j, { Driver } from 'neo4j-driver';
import { quotaEnforcer } from '../lib/resources/QuotaEnforcer.js';
import { PrometheusMetrics } from '../utils/metrics.js';
import {
  invalidateGraphQueryCache,
  recordCacheBypass,
  runWithGraphQueryCache,
} from './queryCache.js';

let primaryDriver: Driver | null = null;
let replicaDriver: Driver | null = null;
const metrics = new PrometheusMetrics('neo4j_driver');
metrics.createGauge('active_sessions', 'Number of active Neo4j sessions');
metrics.createHistogram('query_duration_seconds', 'Neo4j query duration', { buckets: [0.01, 0.05, 0.1, 0.5, 1, 5] });
metrics.createCounter('replica_fallbacks', 'Replica fallbacks when read path fails');
metrics.createCounter('route_choice_total', 'Route selection for graph queries');
metrics.createCounter('sticky_reads', 'Sticky reads routed to primary after write');

let activeSessions = 0;
const recentWrites = new Map<string, number>();
const stickyWindowMs = parseInt(process.env.GRAPH_STICKY_MS || '3000', 10);

function readReplicaConfigured() {
  return process.env.READ_REPLICA === '1' && (process.env.NEO4J_READ_URI || process.env.NEO4J_REPLICA_URI);
}

function stickyKey(tenantId?: string, caseId?: string) {
  return `${tenantId || 'global'}::${caseId || 'global'}`;
}

function markRecentWrite(options: { tenantId?: string; caseId?: string }) {
  recentWrites.set(stickyKey(options.tenantId, options.caseId), Date.now());
}

function shouldStickToPrimary(options: { tenantId?: string; caseId?: string }) {
  const key = stickyKey(options.tenantId, options.caseId);
  const ts = recentWrites.get(key);
  if (!ts) return false;
  const fresh = Date.now() - ts < stickyWindowMs;
  if (!fresh) recentWrites.delete(key);
  return fresh;
}

function buildDriver(uri: string) {
  return neo4j.driver(
    uri,
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'),
    { disableLosslessIntegers: true },
  );
}

export function getDriver(target: 'primary' | 'replica' = 'primary') {
  const wantsReplica = target === 'replica' && readReplicaConfigured();
  if (wantsReplica) {
    if (!replicaDriver) {
      replicaDriver = buildDriver(process.env.NEO4J_READ_URI || process.env.NEO4J_REPLICA_URI || process.env.NEO4J_URI || 'bolt://localhost:7687');
    }
    return replicaDriver;
  }

  if (!primaryDriver) {
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
      if (process.env.NODE_ENV === 'test') {
        throw new Error('Neo4j env vars missing in test');
      }
      console.warn('Neo4j environment variables missing');
    }

    primaryDriver = buildDriver(process.env.NEO4J_URI || 'bolt://localhost:7687');
  }
  return primaryDriver;
}

async function executeWithDriver<T>(
  driver: Driver,
  cypher: string,
  params: Record<string, unknown>,
  mode: 'read' | 'write',
  route: 'primary' | 'replica',
) {
  const session = driver.session({
    defaultAccessMode: mode === 'write' ? neo4j.session.WRITE : neo4j.session.READ,
  });

  activeSessions++;
  metrics.setGauge('active_sessions', activeSessions, { route });

  const start = Date.now();
  try {
    const res = await session.run(cypher, params);
    const duration = (Date.now() - start) / 1000;
    metrics.observeHistogram('query_duration_seconds', duration, { route, mode });
    return res.records.map((r: any) => r.toObject()) as T[];
  } finally {
    await session.close();
    activeSessions--;
    metrics.setGauge('active_sessions', activeSessions, { route });
  }
}

export async function runCypher<T = unknown>(
  cypher: string,
  params: Record<string, unknown> = {},
  options: {
    tenantId?: string;
    caseId?: string;
    permissionsHash?: string;
    cacheTtlSeconds?: number;
    bypassCache?: boolean;
    write?: boolean;
  } = {},
): Promise<T[]> {
  // Write-Aware Sharding Gate (Limited GA)
  if (options.write && options.tenantId) {
    const featureAllowed = quotaEnforcer.isFeatureAllowed(options.tenantId, 'write_aware_sharding');

    const MAX_CONCURRENT_WRITES = 50;
    if (activeSessions > MAX_CONCURRENT_WRITES) {
      throw new Error('Database write queue full (Queue Depth Guard)');
    }

    if (featureAllowed) {
      // Future hook for sharded writes
    }
  }

  const isWrite = !!options.write;
  const stickyPrimary = shouldStickToPrimary(options);
  if (stickyPrimary && !isWrite) {
    metrics.incrementCounter('sticky_reads', { scope: options.caseId ? 'case' : 'tenant' });
  }

  const preferReplica = readReplicaConfigured() && !isWrite && !stickyPrimary;
  const routes: Array<'primary' | 'replica'> = preferReplica ? ['replica', 'primary'] : ['primary'];

  const fetchFromDb = async (): Promise<T[]> => {
    let lastError: unknown;
    for (const route of routes) {
      try {
        const driver = getDriver(route);
        metrics.incrementCounter('route_choice_total', { target: route });
        return await executeWithDriver<T>(driver, cypher, params, isWrite ? 'write' : 'read', route);
      } catch (err: unknown) {
        lastError = err;
        if (route === 'replica') {
          const errorMessage = err instanceof Error ? err.message : 'replica_error';
          metrics.incrementCounter('replica_fallbacks', { reason: errorMessage });
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  };

  const cacheEnabled = process.env.QUERY_CACHE === '1' && !isWrite && options.bypassCache !== true;
  const tenantLabel = options.tenantId || 'unknown';
  let result: T[];

  if (cacheEnabled) {
    result = await runWithGraphQueryCache<T>(
      {
        query: cypher,
        params,
        tenantId: options.tenantId,
        caseId: options.caseId,
        permissionsHash: options.permissionsHash,
        ttlSeconds: options.cacheTtlSeconds,
        op: 'graph-query',
      },
      fetchFromDb,
    );
  } else {
    const reason = isWrite
      ? 'write'
      : options.bypassCache
        ? 'explicit_bypass'
        : process.env.QUERY_CACHE === '1'
          ? 'sticky_or_other'
          : 'disabled';
    recordCacheBypass(reason, 'graph-query', tenantLabel);
    result = await fetchFromDb();
  }

  if (isWrite) {
    markRecentWrite(options);
    await invalidateGraphQueryCache({
      tenantId: options.tenantId,
      caseId: options.caseId,
      permissionsHash: options.permissionsHash,
    });
  }

  return result;
}

export async function closeDriver() {
  if (primaryDriver) {
    await primaryDriver.close();
    primaryDriver = null;
  }
  if (replicaDriver) {
    await replicaDriver.close();
    replicaDriver = null;
  }
}

export function __resetGraphConnectionsForTests() {
  primaryDriver = null;
  replicaDriver = null;
  activeSessions = 0;
  recentWrites.clear();
}
