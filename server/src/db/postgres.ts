import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
// @ts-ignore - pg type imports
import { Pool, QueryConfig, QueryResult, PoolClient } from 'pg';
import dotenv from 'dotenv';
import baseLogger from '../config/logger';

dotenv.config();

type QueryInput = string | QueryConfig<any>;

interface QueryOptions {
  forceWrite?: boolean;
  timeoutMs?: number;
  label?: string;
}

type QueryExecutor = <T = any>(
  query: QueryInput,
  params?: any[],
  options?: QueryOptions,
) => Promise<QueryResult<T>>;

interface PoolHealthSnapshot {
  name: string;
  type: 'write' | 'read';
  circuitState: CircuitState;
  healthy: boolean;
  lastError?: string;
  region?: string;
  priority?: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  totalConnections: number;
  healthScore?: number;
  avgLatencyMs?: number;
  successStreak?: number;
  failureStreak?: number;
}

export interface ManagedPostgresPool {
  query: QueryExecutor;
  read: QueryExecutor;
  write: QueryExecutor;
  connect: () => Promise<PoolClient>;
  end: () => Promise<void>;
  on: Pool['on'];
  healthCheck: () => Promise<PoolHealthSnapshot[]>;
  slowQueryInsights: () => SlowQueryInsight[];
  replicaHealth: () => ReplicaHealthSnapshot[];
}

interface SlowQueryInsight {
  key: string;
  pool: string;
  executions: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

type CircuitState = 'closed' | 'half-open' | 'open';

interface ReplicaHealthSnapshot {
  name: string;
  region?: string;
  priority: number;
  healthScore: number;
  avgLatencyMs: number;
  successStreak: number;
  failureStreak: number;
}

const logger = baseLogger.child({ name: 'postgres-pool' });

const DEFAULT_WRITE_POOL_SIZE = parseInt(
  process.env.PG_WRITE_POOL_SIZE ?? '24',
  10,
);
const DEFAULT_READ_POOL_SIZE = parseInt(
  process.env.PG_READ_POOL_SIZE ?? '60',
  10,
);
const MAX_RETRIES = parseInt(process.env.PG_QUERY_MAX_RETRIES ?? '3', 10);
const RETRY_BASE_DELAY_MS = parseInt(
  process.env.PG_RETRY_BASE_DELAY_MS ?? '40',
  10,
);
const RETRY_MAX_DELAY_MS = parseInt(
  process.env.PG_RETRY_MAX_DELAY_MS ?? '500',
  10,
);
const READ_TIMEOUT_MS = parseInt(process.env.PG_READ_TIMEOUT_MS ?? '5000', 10);
const WRITE_TIMEOUT_MS = parseInt(
  process.env.PG_WRITE_TIMEOUT_MS ?? '30000',
  10,
);
const CONNECTION_LEAK_THRESHOLD_MS = parseInt(
  process.env.PG_CONNECTION_LEAK_THRESHOLD_MS ?? '15000',
  10,
);
const SLOW_QUERY_THRESHOLD_MS = parseInt(
  process.env.PG_SLOW_QUERY_THRESHOLD_MS ?? '2000',
  10,
);
const MAX_PREPARED_STATEMENTS = parseInt(
  process.env.PG_PREPARED_STATEMENT_CACHE_SIZE ?? '500',
  10,
);
const MAX_SLOW_QUERY_ENTRIES = parseInt(
  process.env.PG_SLOW_QUERY_ANALYSIS_ENTRIES ?? '200',
  10,
);
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = parseInt(
  process.env.PG_CIRCUIT_BREAKER_FAILURE_THRESHOLD ?? '5',
  10,
);
const CIRCUIT_BREAKER_COOLDOWN_MS = parseInt(
  process.env.PG_CIRCUIT_BREAKER_COOLDOWN_MS ?? '30000',
  10,
);

const READ_REPLICA_REGION_BONUS = parseInt(
  process.env.PG_READ_REPLICA_REGION_BONUS ?? '12',
  10,
);
const READ_REPLICA_PRIORITY_WEIGHT = parseInt(
  process.env.PG_READ_REPLICA_PRIORITY_WEIGHT ?? '1',
  10,
);
const READ_REPLICA_HEALTH_THRESHOLD = parseInt(
  process.env.PG_READ_REPLICA_HEALTH_THRESHOLD ?? '20',
  10,
);
const READ_REPLICA_LATENCY_BASELINE_MS = Math.max(
  parseInt(process.env.PG_READ_REPLICA_LATENCY_BASELINE_MS ?? '120', 10),
  1,
);
const READ_REPLICA_HEALTH_DECAY = Math.min(
  Math.max(parseFloat(process.env.PG_READ_REPLICA_HEALTH_DECAY ?? '0.25'), 0.05),
  0.9,
);
const READ_REPLICA_FAILURE_WEIGHT = parseInt(
  process.env.PG_READ_REPLICA_FAILURE_WEIGHT ?? '15',
  10,
);
const READ_REPLICA_SUCCESS_RECOVERY_WEIGHT = parseInt(
  process.env.PG_READ_REPLICA_SUCCESS_RECOVERY_WEIGHT ?? '5',
  10,
);
const READ_REPLICA_ALLOW_DEGRADED =
  (process.env.PG_READ_REPLICA_ALLOW_DEGRADED ?? 'true') !== 'false';
const FAILOVER_TO_WRITER_ON_READ_FAILURE =
  (process.env.PG_FAILOVER_TO_WRITER ?? 'true') !== 'false';

// New configurations for optimized pooling
const IDLE_TIMEOUT_MS = parseInt(
  process.env.PG_IDLE_TIMEOUT_MS ?? '30000',
  10,
);
const MAX_LIFETIME_MS = parseInt(
  process.env.PG_MAX_LIFETIME_MS ?? '3600000', // 1 hour default
  10,
);
const POOL_MONITOR_INTERVAL_MS = parseInt(
  process.env.PG_POOL_MONITOR_INTERVAL_MS ?? '15000',
  10,
);
const WAIT_QUEUE_THRESHOLD = parseInt(
  process.env.PG_WAIT_QUEUE_THRESHOLD ?? '20',
  10,
);

interface PoolWrapper {
  name: string;
  type: 'write' | 'read';
  pool: Pool;
  circuitBreaker: CircuitBreaker;
  region?: string;
  priority?: number;
}

interface PoolConfig {
  connectionString?: string;
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
}

interface ReadReplicaConfig {
  config: PoolConfig;
  name: string;
  region?: string;
  priority: number;
}

// Extend PoolClient to include connectedAt
interface ExtendedPoolClient extends PoolClient {
  connectedAt?: number;
}

class CircuitBreaker {
  private failureCount = 0;
  private state: CircuitState = 'closed';
  private openUntil = 0;
  private lastError?: Error;

  constructor(
    private readonly name: string,
    private readonly failureThreshold: number,
    private readonly cooldownMs: number,
  ) {}

  canExecute(): boolean {
    if (this.state === 'open') {
      if (Date.now() >= this.openUntil) {
        this.state = 'half-open';
        logger.warn(
          { pool: this.name },
          'PostgreSQL circuit breaker half-open',
        );
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    if (this.state !== 'closed' || this.failureCount !== 0) {
      logger.info({ pool: this.name }, 'PostgreSQL circuit breaker reset');
    }
    this.failureCount = 0;
    this.state = 'closed';
    this.openUntil = 0;
    this.lastError = undefined;
  }

  recordFailure(error: Error): void {
    this.failureCount += 1;
    this.lastError = error;

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.openUntil = Date.now() + this.cooldownMs;
      logger.error(
        { pool: this.name, failureCount: this.failureCount, err: error },
        'PostgreSQL circuit breaker opened',
      );
    } else if (this.state === 'half-open') {
      this.state = 'open';
      this.openUntil = Date.now() + this.cooldownMs;
      logger.error(
        { pool: this.name, err: error },
        'PostgreSQL circuit breaker re-opened while half-open',
      );
    }
  }

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() >= this.openUntil) {
      return 'half-open';
    }
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getLastError(): Error | undefined {
    return this.lastError;
  }
}

interface ReplicaHealthRecord {
  avgLatencyMs: number;
  failureStreak: number;
  successStreak: number;
  lastFailureAt?: number;
  lastSuccessAt?: number;
}

class ReplicaHealthTracker {
  private readonly records = new Map<string, ReplicaHealthRecord>();
  private readonly metadata = new Map<
    string,
    { region?: string; priority: number; circuitBreaker: CircuitBreaker }
  >();

  constructor(private readonly preferredRegions: string[]) {}

  registerPool(pool: PoolWrapper): void {
    this.metadata.set(pool.name, {
      region: pool.region,
      priority: pool.priority ?? 100,
      circuitBreaker: pool.circuitBreaker,
    });
    if (!this.records.has(pool.name)) {
      this.records.set(pool.name, {
        avgLatencyMs: READ_REPLICA_LATENCY_BASELINE_MS,
        failureStreak: 0,
        successStreak: 0,
      });
    }
  }

  recordSuccess(pool: PoolWrapper, durationMs: number): void {
    if (pool.type !== 'read') return;
    const record = this.getRecord(pool.name);

    record.avgLatencyMs =
      record.avgLatencyMs * (1 - READ_REPLICA_HEALTH_DECAY) +
      durationMs * READ_REPLICA_HEALTH_DECAY;
    record.failureStreak = Math.max(record.failureStreak - 1, 0);
    record.successStreak += 1;
    record.lastSuccessAt = Date.now();
    this.records.set(pool.name, record);
  }

  recordFailure(pool: PoolWrapper): void {
    if (pool.type !== 'read') return;
    const record = this.getRecord(pool.name);
    record.failureStreak += 1;
    record.successStreak = 0;
    record.lastFailureAt = Date.now();
    this.records.set(pool.name, record);
  }

  getHealthScore(pool: PoolWrapper): number {
    if (pool.type !== 'read') return 100;
    const record = this.getRecord(pool.name);
    const meta = this.metadata.get(pool.name);
    const priority = (meta?.priority ?? 100) / Math.max(READ_REPLICA_PRIORITY_WEIGHT, 1);
    const latencyPenalty = Math.min(
      (record.avgLatencyMs / READ_REPLICA_LATENCY_BASELINE_MS) * 15,
      40,
    );
    const failurePenalty = Math.min(record.failureStreak * READ_REPLICA_FAILURE_WEIGHT, 45);
    const recoveryBonus = Math.min(record.successStreak * READ_REPLICA_SUCCESS_RECOVERY_WEIGHT, 20);
    const regionBonus = this.preferredRegions.includes(meta?.region ?? '')
      ? READ_REPLICA_REGION_BONUS
      : 0;
    const circuitPenalty =
      (meta?.circuitBreaker ?? pool.circuitBreaker).getState() === 'open'
        ? 50
        : (meta?.circuitBreaker ?? pool.circuitBreaker).getState() === 'half-open'
          ? 25
          : 0;

    const score =
      priority + regionBonus + recoveryBonus - latencyPenalty - failurePenalty - circuitPenalty;

    return Math.max(0, Math.round(score));
  }

  getSnapshotFor(pool: PoolWrapper): ReplicaHealthSnapshot | undefined {
    if (pool.type !== 'read') return undefined;
    const record = this.getRecord(pool.name);
    const meta = this.metadata.get(pool.name);

    return {
      name: pool.name,
      region: meta?.region,
      priority: meta?.priority ?? 100,
      healthScore: this.getHealthScore(pool),
      avgLatencyMs: record.avgLatencyMs,
      successStreak: record.successStreak,
      failureStreak: record.failureStreak,
    };
  }

  snapshot(): ReplicaHealthSnapshot[] {
    return Array.from(this.records.entries()).map(([name, record]) => {
      const meta = this.metadata.get(name);
      return {
        name,
        region: meta?.region,
        priority: meta?.priority ?? 100,
        healthScore: this.getHealthScore({
          name,
          type: 'read',
          pool: {} as Pool,
          circuitBreaker: meta?.circuitBreaker ?? new CircuitBreaker(name, 1, 1),
          region: meta?.region,
          priority: meta?.priority,
        }),
        avgLatencyMs: record.avgLatencyMs,
        successStreak: record.successStreak,
        failureStreak: record.failureStreak,
      };
    });
  }

  reset(): void {
    this.records.clear();
    this.metadata.clear();
  }

  private getRecord(name: string): ReplicaHealthRecord {
    if (!this.records.has(name)) {
      this.records.set(name, {
        avgLatencyMs: READ_REPLICA_LATENCY_BASELINE_MS,
        failureStreak: 0,
        successStreak: 0,
      });
    }

    return this.records.get(name)!;
  }
}

class PoolMonitor {
  private intervalId?: NodeJS.Timeout;
  private pools: PoolWrapper[] = [];

  constructor() {}

  register(pool: PoolWrapper) {
    this.pools.push(pool);
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(
      () => this.check(),
      POOL_MONITOR_INTERVAL_MS,
    );
    // Unref so it doesn't prevent shutdown if only monitor is running
    this.intervalId.unref();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.pools = [];
  }

  private check() {
    for (const wrapper of this.pools) {
      const total = wrapper.pool.totalCount ?? 0;
      const idle = wrapper.pool.idleCount ?? 0;
      const waiting = wrapper.pool.waitingCount ?? 0;
      const active = total - idle;

      // Log pool stats
      logger.debug(
        {
          pool: wrapper.name,
          total,
          idle,
          active,
          waiting,
        },
        'Pool Monitor Stats',
      );

      // Alert on exhaustion
      if (waiting > WAIT_QUEUE_THRESHOLD) {
        logger.warn(
          {
            pool: wrapper.name,
            waiting,
            threshold: WAIT_QUEUE_THRESHOLD,
          },
          'PostgreSQL Pool Exhaustion Risk',
        );
      }

      // Proactive health check on idle connections could be implemented here
      // But we rely on validateConnection on borrow for now to avoid storming
    }
  }
}

const preparedStatementCache = new Map<string, string>();
const slowQueryStats = new Map<
  string,
  { count: number; totalDuration: number; maxDuration: number; pool: string }
>();

let writePoolWrapper: PoolWrapper | null = null;
let readPoolWrappers: PoolWrapper[] = [];
let managedPool: ManagedPostgresPool | null = null;
let readReplicaCursor = 0;
const poolMonitor = new PoolMonitor();

const transientErrorCodes = new Set([
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '53300', // too_many_connections
  '08000',
  '08003',
  '08006',
  '08001',
  '08004',
  '08007',
  '08P01',
  '40001',
]);

const transientNodeErrors = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'EPIPE',
]);

function parseConnectionConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.POSTGRES_HOST || 'postgres',
    user: process.env.POSTGRES_USER || 'intelgraph',
    password: process.env.POSTGRES_PASSWORD || 'devpassword',
    database: process.env.POSTGRES_DB || 'intelgraph_dev',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  };
}

function parsePreferredReadRegions(): string[] {
  const preferred = (process.env.PG_PREFERRED_READ_REGIONS || '').split(',');
  const current = process.env.CURRENT_REGION
    ? [process.env.CURRENT_REGION]
    : [];

  return [...new Set([...preferred, ...current])].map((region) => region.trim()).filter(Boolean);
}

function parseReplicaEntry(entry: string, idx: number): ReadReplicaConfig | null {
  const [url, ...metaParts] = entry.split('|').map((segment) => segment.trim());
  if (!url) return null;

  const metadata: Record<string, string> = {};
  metaParts.forEach((part) => {
    const [key, value] = part.split('=').map((segment) => segment.trim());
    if (key && value) {
      metadata[key.toLowerCase()] = value;
    }
  });

  return {
    config: { connectionString: url },
    name: metadata.name ?? `read-replica-${idx + 1}`,
    region: metadata.region,
    priority: Number.isFinite(parseInt(metadata.priority ?? '', 10))
      ? parseInt(metadata.priority ?? '100', 10)
      : 100,
  };
}

function parseReadReplicaConfigs(): ReadReplicaConfig[] {
  const explicit = (process.env.DATABASE_READ_REPLICAS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((entry, idx) => parseReplicaEntry(entry, idx))
    .filter(Boolean) as ReadReplicaConfig[];

  const legacy = process.env.DATABASE_READ_URL
    ? [
        {
          config: { connectionString: process.env.DATABASE_READ_URL },
          name: 'read-legacy',
          region: undefined,
          priority: 80,
        } satisfies ReadReplicaConfig,
      ]
    : [];

  return [...explicit, ...legacy];
}

let replicaHealthTracker = new ReplicaHealthTracker(parsePreferredReadRegions());

function createPool(
  config: PoolConfig,
  name: string,
  type: 'write' | 'read',
  max: number,
  metadata?: { region?: string; priority?: number },
): PoolWrapper {
  const pool = new Pool({
    ...config,
    max,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: 5000,
    application_name: `summit-${type}-${process.env.CURRENT_REGION || 'global'}`,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : false,
  });

  pool.on('error', (err) => {
    logger.error({ pool: name, err }, 'Unexpected PostgreSQL client error');
  });

  // Track connection lifetime
  pool.on('connect', (client: ExtendedPoolClient) => {
    client.connectedAt = Date.now();
    logger.debug({ pool: name }, 'New PostgreSQL connection established');
  });

  return {
    name,
    type,
    pool,
    circuitBreaker: new CircuitBreaker(
      name,
      CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      CIRCUIT_BREAKER_COOLDOWN_MS,
    ),
    region: metadata?.region,
    priority: metadata?.priority,
  };
}

function initializePools(): void {
  if (managedPool) {
    return;
  }

  replicaHealthTracker = new ReplicaHealthTracker(parsePreferredReadRegions());
  replicaHealthTracker.reset();
  const baseConfig = parseConnectionConfig();
  writePoolWrapper = createPool(
    baseConfig,
    'write-primary',
    'write',
    DEFAULT_WRITE_POOL_SIZE,
    { region: process.env.PG_PRIMARY_REGION || process.env.CURRENT_REGION },
  );
  poolMonitor.register(writePoolWrapper);

  const replicaConfigs = parseReadReplicaConfigs();
  if (replicaConfigs.length === 0) {
    const pool = createPool(
      baseConfig,
      'read-default',
      'read',
      DEFAULT_READ_POOL_SIZE,
      { region: process.env.CURRENT_REGION, priority: 100 },
    );
    readPoolWrappers = [pool];
    replicaHealthTracker.registerPool(pool);
    poolMonitor.register(pool);
  } else {
    readPoolWrappers = replicaConfigs.map((replica) => {
      const pool = createPool(
        replica.config,
        replica.name,
        'read',
        DEFAULT_READ_POOL_SIZE,
        { region: replica.region, priority: replica.priority },
      );
      replicaHealthTracker.registerPool(pool);
      poolMonitor.register(pool);
      return pool;
    });
  }

  poolMonitor.start();
  managedPool = createManagedPool(writePoolWrapper, readPoolWrappers);
}

function createManagedPool(
  writePool: PoolWrapper,
  readPools: PoolWrapper[],
): ManagedPostgresPool {
  const query: QueryExecutor = (queryInput, params, options = {}) =>
    executeManagedQuery({
      queryInput,
      params,
      options,
      desiredType: 'auto',
      writePool,
      readPools,
    });

  const read: QueryExecutor = (queryInput, params, options = {}) =>
    executeManagedQuery({
      queryInput,
      params,
      options: { ...options, forceWrite: false },
      desiredType: 'read',
      writePool,
      readPools,
    });

  const write: QueryExecutor = (queryInput, params, options = {}) =>
    executeManagedQuery({
      queryInput,
      params,
      options: { ...options, forceWrite: true },
      desiredType: 'write',
      writePool,
      readPools,
    });

  const connect = async (): Promise<PoolClient> => {
    return withManagedClient(writePool, WRITE_TIMEOUT_MS, async (c) => c, { skipRelease: true });
  };

  const end = async (): Promise<void> => {
    poolMonitor.stop();
    await Promise.all([
      writePool.pool.end(),
      ...readPools.map((wrapper) => wrapper.pool.end()),
    ]);
    managedPool = null;
    writePoolWrapper = null;
    readPoolWrappers = [];
  };

  const on: Pool['on'] = (event: any, listener: any) => {
    writePool.pool.on(event, listener);
    readPools.forEach((wrapper) => wrapper.pool.on(event, listener));
    return managedPool as unknown as Pool;
  };

  const healthCheck = async (): Promise<PoolHealthSnapshot[]> => {
    const pools = [writePool, ...readPools];

    const checks = await Promise.all(
      pools.map(async (wrapper) => {
        const snapshot: PoolHealthSnapshot = {
          name: wrapper.name,
          type: wrapper.type,
          circuitState: wrapper.circuitBreaker.getState(),
          healthy: true,
          region: wrapper.region,
          priority: wrapper.priority,
          activeConnections:
            (wrapper.pool.totalCount ?? 0) - (wrapper.pool.idleCount ?? 0),
          idleConnections: wrapper.pool.idleCount ?? 0,
          queuedRequests: wrapper.pool.waitingCount ?? 0,
          totalConnections: wrapper.pool.totalCount ?? 0,
        };

        const replicaSnapshot = replicaHealthTracker.getSnapshotFor(wrapper);
        if (replicaSnapshot) {
          snapshot.healthScore = replicaSnapshot.healthScore;
          snapshot.avgLatencyMs = replicaSnapshot.avgLatencyMs;
          snapshot.successStreak = replicaSnapshot.successStreak;
          snapshot.failureStreak = replicaSnapshot.failureStreak;
        }

        try {
          // Use withManagedClient to leverage validation logic
          await withManagedClient(wrapper, 1000, async (client) => {
            await client.query('SELECT 1');
          });
        } catch (error) {
          snapshot.healthy = false;
          snapshot.lastError = (error as Error).message;
        }

        const breakerError = wrapper.circuitBreaker.getLastError();
        if (breakerError && !snapshot.lastError) {
          snapshot.lastError = breakerError.message;
        }

        return snapshot;
      }),
    );

    return checks;
  };

  const slowQueryInsights = (): SlowQueryInsight[] => {
    const entries = Array.from(slowQueryStats.entries()).map(
      ([key, value]) => ({
        key,
        pool: value.pool,
        executions: value.count,
        avgDurationMs: value.totalDuration / Math.max(value.count, 1),
        maxDurationMs: value.maxDuration,
      }),
    );

    return entries.sort((a, b) => b.maxDurationMs - a.maxDurationMs);
  };

  const replicaHealth = (): ReplicaHealthSnapshot[] => {
    return replicaHealthTracker.snapshot();
  };

  return {
    query,
    read,
    write,
    connect,
    end,
    on,
    healthCheck,
    slowQueryInsights,
    replicaHealth,
  };
}

async function executeManagedQuery({
  queryInput,
  params,
  options,
  desiredType,
  writePool,
  readPools,
}: {
  queryInput: QueryInput;
  params?: any[];
  options: QueryOptions;
  desiredType: 'auto' | 'read' | 'write';
  writePool: PoolWrapper;
  readPools: PoolWrapper[];
}): Promise<QueryResult<any>> {
  const normalized = normalizeQuery(queryInput, params);
  const inferredType =
    desiredType === 'auto' ? inferQueryType(normalized.text) : desiredType;
  const queryType = options.forceWrite ? 'write' : inferredType;
  const readCandidates = queryType === 'write' ? [] : pickReadPoolSequence(readPools);
  const label = options.label ?? inferOperation(normalized.text);

  let poolCandidates: PoolWrapper[] = [];
  if (queryType === 'write') {
    poolCandidates = [writePool];
  } else {
    poolCandidates = [...readCandidates];
    if (FAILOVER_TO_WRITER_ON_READ_FAILURE) {
      poolCandidates.push(writePool);
    }
  }

  if (queryType === 'read' && readCandidates.length === 0) {
    if (FAILOVER_TO_WRITER_ON_READ_FAILURE) {
      logger.warn(
        { label, desiredType, reason: 'no_healthy_read_replicas' },
        'Falling back to writer for read because no healthy replicas are available',
      );
    } else {
      throw new Error('No healthy read replicas available and writer failover disabled');
    }
  }

  if (poolCandidates.length === 0) {
    throw new Error('No PostgreSQL pools available for query execution');
  }
  const timeoutMs =
    options.timeoutMs ??
    (queryType === 'write' ? WRITE_TIMEOUT_MS : READ_TIMEOUT_MS);

  let lastError: Error | undefined;

  for (const candidate of poolCandidates) {
    if (candidate.type === 'read' && !candidate.circuitBreaker.canExecute()) {
      lastError = candidate.circuitBreaker.getLastError();
      continue;
    }

    try {
      return await executeWithRetry(candidate, normalized, timeoutMs, label);
    } catch (error) {
      lastError = error as Error;

      if (!isRetryableError(error)) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Failed to execute PostgreSQL query');
}

async function executeWithRetry(
  wrapper: PoolWrapper,
  normalizedQuery: { text: string; values: any[]; name: string },
  timeoutMs: number,
  label: string,
): Promise<QueryResult<any>> {
  let attempt = 0;
  let delay = RETRY_BASE_DELAY_MS;

  while (attempt <= MAX_RETRIES) {
    try {
      const result = await withManagedClient(wrapper, timeoutMs, (client) =>
        executeQueryOnClient(client, normalizedQuery, wrapper, label),
      );
      wrapper.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      const err = error as Error;
      wrapper.circuitBreaker.recordFailure(err);

      if (wrapper.type === 'read') {
        replicaHealthTracker.recordFailure(wrapper);
      }

      if (!isRetryableError(err) || attempt === MAX_RETRIES) {
        throw err;
      }

      const jitter = Math.random() * 10;
      await delayAsync(Math.min(delay, RETRY_MAX_DELAY_MS) + jitter);
      delay = Math.min(delay * 2, RETRY_MAX_DELAY_MS);
      attempt += 1;
    }
  }

  throw new Error('PostgreSQL query exhausted retries');
}

async function executeQueryOnClient(
  client: PoolClient,
  normalizedQuery: { text: string; values: any[]; name: string },
  wrapper: PoolWrapper,
  label: string,
): Promise<QueryResult<any>> {
  const start = performance.now();
  const result = await client.query({
    text: normalizedQuery.text,
    values: normalizedQuery.values,
    name: normalizedQuery.name,
  });

  const duration = performance.now() - start;

  if (wrapper.type === 'read') {
    replicaHealthTracker.recordSuccess(wrapper, duration);
  }

  if (duration >= SLOW_QUERY_THRESHOLD_MS) {
    recordSlowQuery(
      normalizedQuery.name,
      duration,
      wrapper.name,
      normalizedQuery.text,
    );
  }

  logger.debug(
    {
      pool: wrapper.name,
      label,
      durationMs: duration,
      rows: result.rowCount ?? 0,
    },
    'PostgreSQL query executed',
  );

  return result;
}

// Validation and Lifetime check
async function withManagedClient<T>(
  poolWrapper: PoolWrapper,
  timeoutMs: number,
  fn: (client: PoolClient) => Promise<T>,
  options: { skipRelease?: boolean } = {}
): Promise<T> {
  const startWait = performance.now();
  let client = (await poolWrapper.pool.connect()) as ExtendedPoolClient;
  const waitTime = performance.now() - startWait;

  // Track wait times? (Could add to metrics if needed)

  // Max Lifetime Check
  if (client.connectedAt && (Date.now() - client.connectedAt > MAX_LIFETIME_MS)) {
    logger.debug({ pool: poolWrapper.name }, 'Closing expired PostgreSQL connection');
    client.release(true); // Destroy
    // Retry get new connection
    return withManagedClient(poolWrapper, timeoutMs, fn, options);
  }

  // Connection Validation (Health Check)
  // We can do a quick check if it's been idle for a while?
  // For now, rely on standard pg behavior + max lifetime + circuit breaker.
  // Explicit "validate before use" would be:
  // await client.query('SELECT 1'); // But this adds overhead.

  const leakTimer = setTimeout(() => {
    logger.error(
      { pool: poolWrapper.name },
      'Possible PostgreSQL connection leak detected',
    );
  }, CONNECTION_LEAK_THRESHOLD_MS);

  try {
    await client.query('SET statement_timeout = $1', [timeoutMs]);
  } catch (error) {
    clearTimeout(leakTimer);
    client.release(true); // Force release on setup error
    throw error;
  }

  try {
    const result = await fn(client);
    if (!options.skipRelease) {
      // release logic is handled in finally
    }
    return result;
  } finally {
    if (!options.skipRelease) {
       try {
        await client.query('RESET statement_timeout');
        client.release();
      } catch (error) {
        logger.warn(
          { pool: poolWrapper.name, err: error },
          'Failed to reset statement timeout or release',
        );
        client.release(true);
      }
    }

    clearTimeout(leakTimer);
  }
}

function normalizeQuery(
  query: QueryInput,
  params?: any[],
): { text: string; values: any[]; name: string } {
  if (typeof query === 'string') {
    const trimmed = query.trim();
    return {
      text: trimmed,
      values: params ?? [],
      name: getPreparedStatementName(trimmed),
    };
  }

  const text = query.text.trim();
  const values = query.values ?? params ?? [];

  return {
    text,
    values,
    name: query.name ?? getPreparedStatementName(text),
  };
}

function getPreparedStatementName(queryText: string): string {
  const normalized = queryText.replace(/\s+/g, ' ').trim();
  const existing = preparedStatementCache.get(normalized);
  if (existing) {
    return existing;
  }

  const hash = crypto
    .createHash('sha1')
    .update(normalized)
    .digest('hex')
    .slice(0, 16);
  const name = `stmt_${hash}`;
  preparedStatementCache.set(normalized, name);

  if (preparedStatementCache.size > MAX_PREPARED_STATEMENTS) {
    const firstKey = preparedStatementCache.keys().next().value;
    if (firstKey) {
      preparedStatementCache.delete(firstKey);
    }
  }

  return name;
}

function recordSlowQuery(
  statementName: string,
  duration: number,
  poolName: string,
  sql: string,
): void {
  const key = `${poolName}:${statementName}`;
  const entry = slowQueryStats.get(key) ?? {
    count: 0,
    totalDuration: 0,
    maxDuration: 0,
    pool: poolName,
  };
  entry.count += 1;
  entry.totalDuration += duration;
  entry.maxDuration = Math.max(entry.maxDuration, duration);
  slowQueryStats.set(key, entry);

  if (slowQueryStats.size > MAX_SLOW_QUERY_ENTRIES) {
    const iterator = slowQueryStats.keys().next();
    if (!iterator.done) {
      slowQueryStats.delete(iterator.value);
    }
  }

  logger.warn(
    { pool: poolName, durationMs: duration, statement: statementName, sql },
    'Slow PostgreSQL query detected',
  );
}

function pickReadPoolSequence(readPools: PoolWrapper[]): PoolWrapper[] {
  if (readPools.length === 0) {
    return [];
  }

  const scored = readPools.map((pool) => ({
    pool,
    score: replicaHealthTracker.getHealthScore(pool),
  }));

  const healthy = scored
    .filter((entry) => entry.score >= READ_REPLICA_HEALTH_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const degraded = scored
    .filter((entry) => entry.score < READ_REPLICA_HEALTH_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const ordered = [...healthy, ...(READ_REPLICA_ALLOW_DEGRADED ? degraded : [])];

  if (ordered.length === 0) {
    return [];
  }

  const offset = ordered.length > 0 ? readReplicaCursor % ordered.length : 0;
  readReplicaCursor = (readReplicaCursor + 1) % ordered.length;

  return [...ordered.slice(offset), ...ordered.slice(0, offset)].map(
    (entry) => entry.pool,
  );
}

function inferQueryType(queryText: string): 'read' | 'write' {
  const normalized = queryText.trim().toLowerCase();
  if (normalized.startsWith('with')) {
    const match = normalized.match(
      /with\s+[\s\S]*?\b(select|insert|update|delete|merge|create|alter|drop)\b/,
    );
    if (match && match[1]) {
      return [
        'insert',
        'update',
        'delete',
        'merge',
        'create',
        'alter',
        'drop',
      ].includes(match[1])
        ? 'write'
        : 'read';
    }
  }

  const firstToken = normalized.split(/\s+/)[0];
  if (
    ['select', 'show', 'describe', 'explain'].includes(firstToken) ||
    normalized.startsWith('values')
  ) {
    return 'read';
  }

  return 'write';
}

function inferOperation(queryText: string): string {
  const normalized = queryText.trim().toLowerCase();
  const token = normalized.split(/\s+/)[0];
  if (token === 'with') {
    return 'cte';
  }
  return token;
}

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const pgError = error as { code?: string };
  const nodeError = error as { errno?: string; code?: string };

  if (pgError.code && transientErrorCodes.has(pgError.code)) {
    return true;
  }

  if (nodeError.code && transientNodeErrors.has(nodeError.code)) {
    return true;
  }

  return false;
}

function delayAsync(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

export function getPostgresPool(): ManagedPostgresPool {
  initializePools();
  if (!managedPool) {
    throw new Error('Failed to initialize PostgreSQL pool');
  }
  return managedPool;
}

export async function closePostgresPool(): Promise<void> {
  if (managedPool) {
    await managedPool.end();
    managedPool = null;
  }

  replicaHealthTracker.reset();
  readReplicaCursor = 0;
}

export const __private = {
  initializePools,
  getPoolsSnapshot: () => ({ writePoolWrapper, readPoolWrappers }),
  getPreparedStatementName,
  inferQueryType,
  isRetryableError,
  CircuitBreaker,
  parseReadReplicaConfigs,
  parsePreferredReadRegions,
  replicaHealthTracker,
};
