import type { Neo4jHealth } from './neo4j.js';
import { checkNeo4jHealth } from './neo4j.js';
import { getPostgresPool } from './postgres.js';
import type { ManagedPostgresPool } from './postgres.js';
import type { RedisHealth } from './redis.js';
import { getRedisHealth } from './redis.js';

export type DependencyHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type DependencyHealthReport = {
  status: DependencyHealthStatus;
  timestamp: string;
  services: {
    neo4j: Neo4jHealth & { status: DependencyHealthStatus };
    postgres: {
      status: DependencyHealthStatus;
      pools: Awaited<ReturnType<ManagedPostgresPool['healthCheck']>>;
      lastError?: string;
    };
    redis: RedisHealth & { status: DependencyHealthStatus };
  };
  errors: Array<{ service: string; message: string }>;
};

export async function getDependencyHealth(): Promise<DependencyHealthReport> {
  const neo4j = await checkNeo4jHealth();
  const postgres = await getPostgresHealth();
  const redis = await getRedisHealth();

  const redisCircuitStatus =
    redis.circuitState === 'closed' ? 'healthy' : 'degraded';

  const status = coalesceOverallStatus([
    neo4j.healthy ? 'healthy' : 'unhealthy',
    postgres.status,
    redis.healthy ? 'healthy' : 'unhealthy',
    redisCircuitStatus,
  ]);

  const errors: Array<{ service: string; message: string }> = [];

  if (!neo4j.healthy && neo4j.lastError) {
    errors.push({ service: 'neo4j', message: neo4j.lastError });
  }

  if (postgres.lastError) {
    errors.push({ service: 'postgres', message: postgres.lastError });
  }

  if (!redis.healthy && redis.lastError) {
    errors.push({ service: 'redis', message: redis.lastError });
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    services: {
      neo4j: { ...neo4j, status: neo4j.healthy ? 'healthy' : 'unhealthy' },
      postgres,
      redis: { ...redis, status: redis.healthy ? 'healthy' : 'unhealthy' },
    },
    errors,
  };
}

async function getPostgresHealth(): Promise<DependencyHealthReport['services']['postgres']> {
  let lastError: string | undefined;
  let status: DependencyHealthStatus = 'healthy';
  let pools: Awaited<ReturnType<ManagedPostgresPool['healthCheck']>> = [];

  try {
    const pool = getPostgresPool();
    pools = await pool.healthCheck();
  } catch (error) {
    lastError = (error as Error).message;
    status = 'unhealthy';
    return { status, pools, lastError };
  }

  const unhealthyPools = pools.filter((p) => !p.healthy);
  const openCircuits = pools.filter((p) => p.circuitState !== 'closed');

  if (unhealthyPools.length > 0 || openCircuits.length > 0) {
    status = unhealthyPools.length === pools.length ? 'unhealthy' : 'degraded';
    lastError = unhealthyPools[0]?.lastError ?? openCircuits[0]?.lastError;
  }

  return { status, pools, lastError };
}

function coalesceOverallStatus(statuses: DependencyHealthStatus[]): DependencyHealthStatus {
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}
