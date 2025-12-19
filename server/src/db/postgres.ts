// @ts-nocheck
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Pool, QueryConfig, QueryResult, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import baseLogger from '../config/logger.js';
import {
  dbPoolActive,
  dbPoolIdle,
  dbPoolSize,
  dbPoolWaiting,
  dbPoolWaitDurationSeconds,
  dbTransactionDurationSeconds,
  dbLockWaits,
} from '../metrics/dbMetrics.js';
import { dbConfig } from './config.js';

dotenv.config();

type QueryInput = string | QueryConfig<any>;

interface QueryOptions {
  forceWrite?: boolean;
  timeoutMs?: number;
  label?: string;
  readOnly?: boolean;
}

type QueryExecutor = <T = any>(
  query: QueryInput,
  params?: any[],
  options?: QueryOptions,
) => Promise<QueryResult<T>>;

type TransactionCallback<T> = (client: PoolClient) => Promise<T>;
interface TransactionOptions {
  readOnly?: boolean;
  timeoutMs?: number;
  label?: string;
}

interface PoolHealthSnapshot {
  name: string;
  type: 'write' | 'read';
  circuitState: CircuitState;
  healthy: boolean;
  lastError?: string;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  totalConnections: number;
  healthScore: number;
}

export interface ManagedPostgresPool {
  query: QueryExecutor;
  read: QueryExecutor;
  write: QueryExecutor;
  transaction: <T>(
    callback: TransactionCallback<T>,
    options?: TransactionOptions,
  ) => Promise<T>; // Alias for withTransaction
  withTransaction: <T>(
    callback: TransactionCallback<T>,
    options?: TransactionOptions,
  ) => Promise<T>;
  connect: () => Promise<PoolClient>;
  end: () => Promise<void>;
  on: Pool['on'];
  healthCheck: () => Promise<PoolHealthSnapshot[]>;
  slowQueryInsights: () => SlowQueryInsight[];
  pool: Pool;
}

interface SlowQueryInsight {
  key: string;
  pool: string;
  executions: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

type CircuitState = 'closed' | 'half-open' | 'open';

const logger = baseLogger.child({ name: 'postgres-pool' });

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000;
const MAX_PREPARED_STATEMENTS = 500;
const MAX_SLOW_QUERY_ENTRIES = 200;
const CONNECTION_LEAK_THRESHOLD_MS = 60000;
const WAIT_QUEUE_THRESHOLD = 5;
const LOCK_ERROR_CODES = new Set(['55P03', '40P01']);
const tuningEnabled = dbConfig.tuningEnabled;
const getMaxLifetimeMs = () => (dbConfig.maxLifetimeSeconds ?? 0) * 1000;
const getPoolMonitorIntervalMs = () => dbConfig.monitorIntervalMs;

interface PoolWrapper {
  name: string;
  type: 'write' | 'read';
  pool: Pool;
  circuitBreaker: CircuitBreaker;
}

interface PoolConfig {
  connectionString?: string;
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
}

// Extend PoolClient to include connectedAt
interface ExtendedPoolClient extends PoolClient {
  connectedAt?: number;
  release(destroy?: boolean): void;
  query(queryTextOrConfig: string | QueryConfig<any>, values?: any[]): Promise<QueryResult<any>>;
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
  ) { }

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

class PoolMonitor {
  private intervalId?: NodeJS.Timeout;
  private pools: PoolWrapper[] = [];

  constructor() { }

  register(pool: PoolWrapper) {
    this.pools.push(pool);
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(
      () => this.check(),
      getPoolMonitorIntervalMs(),
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

      recordPoolSnapshot(wrapper);

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

function recordPoolSnapshot(wrapper: PoolWrapper): void {
  const total = wrapper.pool.totalCount ?? 0;
  const idle = wrapper.pool.idleCount ?? 0;
  const waiting = wrapper.pool.waitingCount ?? 0;
  const active = total - idle;

  dbPoolSize.set({ database: 'postgres', type: wrapper.type }, total);
  dbPoolIdle.set({ database: 'postgres', type: wrapper.type }, idle);
  dbPoolWaiting.set({ database: 'postgres', type: wrapper.type }, waiting);
  dbPoolActive.set({ database: 'postgres', type: wrapper.type }, active);
}

async function acquireClient(
  wrapper: PoolWrapper,
): Promise<ExtendedPoolClient> {
  const startWait = performance.now();
  const client = (await wrapper.pool.connect()) as ExtendedPoolClient;
  const waitSeconds = (performance.now() - startWait) / 1000;

  dbPoolWaitDurationSeconds.observe(
    { pool: wrapper.name, type: wrapper.type },
    waitSeconds,
  );
  recordPoolSnapshot(wrapper);
  return client;
}

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

function parseReadReplicaConfigs(): Array<{
  url: string;
  region?: string;
  priority: number;
  name: string;
}> {
  const raw = (process.env.DATABASE_READ_REPLICAS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return raw.map((entry, index) => {
    const [url, ...metaParts] = entry.split('|').map((part) => part.trim());
    const meta = metaParts.reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    return {
      url,
      region: meta.region,
      priority: parseInt(meta.priority || `${100 - index}`, 10),
      name: meta.name || `read-replica-${index + 1}`,
    };
  });
}

function createPool(
  name: string,
  type: 'write' | 'read',
  max: number,
): PoolWrapper {
  const baseConfig: PoolConfig = {
    ...dbConfig.connectionConfig,
    max,
    idleTimeoutMillis: dbConfig.idleTimeoutMs,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMs,
    application_name: `summit-${type}-${process.env.CURRENT_REGION || 'global'}`,
  };

  if (tuningEnabled) {
    if (dbConfig.maxLifetimeSeconds) {
      baseConfig.maxLifetimeSeconds = dbConfig.maxLifetimeSeconds;
    }
    if (dbConfig.maxUses) {
      baseConfig.maxUses = dbConfig.maxUses;
    }
    if (dbConfig.statementTimeoutMs > 0) {
      baseConfig.statement_timeout = dbConfig.statementTimeoutMs;
    }
    if (dbConfig.idleInTransactionTimeoutMs > 0) {
      baseConfig.idle_in_transaction_session_timeout =
        dbConfig.idleInTransactionTimeoutMs;
    }
    baseConfig.allowExitOnIdle = true;
  }

  const pool = new Pool({
    ...baseConfig,
  });

  const circuitBreaker = new CircuitBreaker(
    name,
    CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    CIRCUIT_BREAKER_COOLDOWN_MS,
  );

  const wrapper: PoolWrapper = {
    name,
    type,
    pool,
    circuitBreaker,
  };

  pool.on('error', (err) => {
    logger.error({ pool: name, err }, 'Unexpected PostgreSQL client error');
  });

  // Track connection lifetime
  pool.on('connect', (client: ExtendedPoolClient) => {
    client.connectedAt = Date.now();
    logger.debug({ pool: name }, 'New PostgreSQL connection established');
    recordPoolSnapshot(wrapper);
  });

  return wrapper;
}

function initializePools(): void {
  if (managedPool) {
    return;
  }

  writePoolWrapper = createPool(
    'write-primary',
    'write',
    dbConfig.maxPoolSize,
  );

  // TODO: Add read replica support from config if needed
  // For now, read pool is same as write pool if no replicas,
  // or distinct pool with same config if we want separation.
  // Using a separate read pool connected to same DB for now to respect pool sizing.
  const readPool = createPool(
      'read-default',
      'read',
      dbConfig.readPoolSize
  );
  readPoolWrappers = [readPool];

  poolMonitor.register(writePoolWrapper);
  poolMonitor.register(readPool);
  poolMonitor.start();
  recordPoolSnapshot(writePoolWrapper);
  recordPoolSnapshot(readPool);

  managedPool = createManagedPool(writePoolWrapper, readPoolWrappers);
}

function createManagedPool(
  writePool: PoolWrapper,
  readPools: PoolWrapper[],
): ManagedPostgresPool {
  // Prompt 41: Zero-Footprint Mode (Simulated)
  if (process.env.ZERO_FOOTPRINT === 'true') {
    logger.warn('ZERO_FOOTPRINT mode active: PostgreSQL queries will not be persisted.');
    const mockExecutor: QueryExecutor = async (queryInput) => {
      logger.debug('Zero-Footprint: Skipping query execution');
      return { rowCount: 0, rows: [], command: 'MOCK', oid: 0, fields: [] };
    };
    return {
      query: mockExecutor,
      read: mockExecutor,
      write: mockExecutor,
      connect: async () => writePool.pool.connect(), // Connect works but does nothing? Or mock client?
      end: async () => {},
      on: () => ({} as any),
      healthCheck: async () => [],
      slowQueryInsights: () => []
    };
  }

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
    return acquireClient(writePool);
  };

  const withTransaction = async <T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {},
  ): Promise<T> => {
    const timeout = options.timeoutMs ?? dbConfig.statementTimeoutMs;
    const mode: 'read' | 'write' = options.readOnly ? 'read' : 'write';

    return withManagedClient(
      writePool,
      timeout,
      async (client) => callback(client),
      { transactionMode: mode },
    );
  };

  const end = async (): Promise<void> => {
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
          activeConnections:
            (wrapper.pool.totalCount ?? 0) - (wrapper.pool.idleCount ?? 0),
          idleConnections: wrapper.pool.idleCount ?? 0,
          queuedRequests: wrapper.pool.waitingCount ?? 0,
          totalConnections: wrapper.pool.totalCount ?? 0,
          healthScore: 100,
        };

        try {
          // Use withManagedClient to leverage validation logic
          await withManagedClient(wrapper, 1000, async (client) => {
            await client.query('SELECT 1');
          });
        } catch (error) {
          snapshot.healthy = false;
          snapshot.lastError = (error as Error).message;
        }
        snapshot.healthScore = Math.max(
          0,
          100 -
            snapshot.queuedRequests * 10 -
            snapshot.activeConnections * 2 -
            (snapshot.circuitState === 'open' ? 20 : 0),
        );

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

  return {
    query,
    read,
    write,
    transaction: withTransaction,
    withTransaction,
    connect,
    end,
    on,
    healthCheck,
    slowQueryInsights,
    pool: writePool.pool,
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
  const queryType =
    desiredType === 'auto' ? inferQueryType(normalized.text) : desiredType;
  const poolCandidates =
    queryType === 'write'
      ? [writePool]
      : [...pickReadPoolSequence(readPools), writePool];
  const timeoutMs = options.timeoutMs ?? dbConfig.statementTimeoutMs;
  const label = options.label ?? inferOperation(normalized.text);
  const readOnly = options.readOnly ?? queryType === 'read';

  let lastError: Error | undefined;

  for (const candidate of poolCandidates) {
    if (candidate.type === 'read' && !candidate.circuitBreaker.canExecute()) {
      lastError = candidate.circuitBreaker.getLastError();
      continue;
    }

    try {
      return await executeWithRetry(
        candidate,
        normalized,
        timeoutMs,
        label,
        readOnly && tuningEnabled,
      );
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
  readOnly: boolean,
): Promise<QueryResult<any>> {
  let attempt = 0;
  let delay = 40; // Base delay

  while (attempt <= 3) {
    try {
        return await withManagedClient(
          wrapper,
          timeoutMs,
          async (client) =>
            executeQueryOnClient(
              client,
              normalizedQuery,
              wrapper,
              label,
              timeoutMs,
            ),
          { transactionMode: readOnly ? 'read' : undefined },
        );
    } catch (error) {
      const err = error as Error;
      wrapper.circuitBreaker.recordFailure(err);
      const lockCode = getLockErrorCode(err);
      if (lockCode) {
        dbLockWaits.inc({
          pool: wrapper.name,
          type: wrapper.type,
          code: lockCode,
        });
      }

      if (!isRetryableError(err) || attempt === 3) {
        throw err;
      }

      const jitter = Math.random() * 10;
      await delayAsync(Math.min(delay, 500) + jitter);
      delay = Math.min(delay * 2, 500);
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
  _timeoutMs: number,
): Promise<QueryResult<any>> {
  const start = performance.now();

  // Set statement timeout
  // Note: It's better to set this per session or query if possible,
  // but pg driver doesn't support query-level timeout natively without separate command or cancel.
  // Using simplified approach here.

  const result = await client.query({
    text: normalizedQuery.text,
    values: normalizedQuery.values,
    name: normalizedQuery.name,
  });

  const duration = performance.now() - start;

  if (duration >= dbConfig.slowQueryThresholdMs) {
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
  options: { skipRelease?: boolean; transactionMode?: 'read' | 'write'; label?: string } = {},
): Promise<T> {
  let client = await acquireClient(poolWrapper);
  const start = performance.now();
  const transactionMode = options.transactionMode;
  const useTransaction = Boolean(transactionMode);
  const isReadOnlyTx = transactionMode === 'read';
  let outcome: 'committed' | 'rolled_back' = 'committed';

  // Max Lifetime Check
  if (
    getMaxLifetimeMs() > 0 &&
    client.connectedAt &&
    Date.now() - client.connectedAt > getMaxLifetimeMs()
  ) {
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
    if (useTransaction) {
      await client.query('BEGIN');
      if (dbConfig.statementTimeoutMs > 0) {
        await client.query('SET LOCAL statement_timeout = $1', [timeoutMs]);
      }
      if (dbConfig.lockTimeoutMs > 0) {
        await client.query('SET LOCAL lock_timeout = $1', [
          dbConfig.lockTimeoutMs,
        ]);
      }
      if (dbConfig.idleInTransactionTimeoutMs > 0) {
        await client.query('SET LOCAL idle_in_transaction_session_timeout = $1', [
          dbConfig.idleInTransactionTimeoutMs,
        ]);
      }
      if (isReadOnlyTx) {
        await client.query('SET TRANSACTION READ ONLY');
      }
    } else if (dbConfig.statementTimeoutMs > 0) {
      await client.query('SET statement_timeout = $1', [timeoutMs]);
      if (dbConfig.lockTimeoutMs > 0) {
        await client.query('SET lock_timeout = $1', [dbConfig.lockTimeoutMs]);
      }
    }
  } catch (error) {
    clearTimeout(leakTimer);
    client.release(true); // Force release on setup error
    throw error;
  }

  try {
    const result = await fn(client as any);
    if (useTransaction) {
      await client.query('COMMIT');
    }
    if (!options.skipRelease) {
      // release logic is handled in finally
    }
    return result;
  } catch (error) {
    outcome = 'rolled_back';
    if (useTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.warn(
          { pool: poolWrapper.name, err: rollbackError },
          'Failed to rollback transaction',
        );
      }
    }
    const lockCode = getLockErrorCode(error);
    if (lockCode) {
      dbLockWaits.inc({
        pool: poolWrapper.name,
        type: poolWrapper.type,
        code: lockCode,
      });
    }
    throw error;
  } finally {
    if (!options.skipRelease) {
      try {
        if (useTransaction) {
          const durationSeconds = (performance.now() - start) / 1000;
          const txnMode = transactionMode || 'write';
          dbTransactionDurationSeconds.observe(
            {
              pool: poolWrapper.name,
              type: poolWrapper.type,
              mode: txnMode,
              outcome,
            } as any,
            durationSeconds,
          );
        } else if (dbConfig.statementTimeoutMs > 0) {
          await client.query('RESET statement_timeout');
          if (dbConfig.lockTimeoutMs > 0) {
            await client.query('RESET lock_timeout');
          }
        }
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
    recordPoolSnapshot(poolWrapper);
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

  const sequence: PoolWrapper[] = [];
  for (let i = 0; i < readPools.length; i += 1) {
    const index = (readReplicaCursor + i) % readPools.length;
    sequence.push(readPools[index]);
  }

  readReplicaCursor = (readReplicaCursor + 1) % readPools.length;
  return sequence;
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

function getLockErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const code = (error as { code?: string }).code;
  if (code && LOCK_ERROR_CODES.has(code)) {
    return code;
  }

  return null;
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
}

export const __private = {
  initializePools,
  getPoolsSnapshot: () => ({ writePoolWrapper, readPoolWrappers }),
  getPreparedStatementName,
  inferQueryType,
  isRetryableError,
  parseReadReplicaConfigs,
  getLockErrorCode,
  CircuitBreaker,
};
