import * as crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Pool, type QueryConfig, type QueryResult, type PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import baseLogger from '../config/logger.js';
import { dbConfig } from './config.js';

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

type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

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
}

export interface ManagedPostgresPool {
  query: QueryExecutor;
  read: QueryExecutor;
  write: QueryExecutor;
  transaction: <T>(callback: TransactionCallback<T>) => Promise<T>;
  withTransaction: <T>(callback: TransactionCallback<T>) => Promise<T>;
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
const POOL_MONITOR_INTERVAL_MS = 30000;
const WAIT_QUEUE_THRESHOLD = 10;
const MAX_LIFETIME_MS = 3600000;
const CONNECTION_LEAK_THRESHOLD_MS = 60000;

interface PoolWrapper {
  name: string;
  type: 'write' | 'read';
  pool: Pool;
  circuitBreaker: CircuitBreaker;
}

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
  ) { }

  canExecute(): boolean {
    if (this.state === 'open') {
      if (Date.now() >= this.openUntil) {
        this.state = 'half-open';
        logger.warn({ pool: this.name }, 'PostgreSQL circuit breaker half-open');
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

  getLastError(): Error | undefined {
    return this.lastError;
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

function createPool(
  name: string,
  type: 'write' | 'read',
  max: number,
): PoolWrapper {
  const pool = new Pool({
    ...dbConfig.connectionConfig,
    max,
    idleTimeoutMillis: dbConfig.idleTimeoutMs,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMs,
    application_name: `summit-${type}-${process.env.CURRENT_REGION || 'global'}`,
  });

  pool.on('error', (err) => {
    logger.error({ pool: name, err }, 'Unexpected PostgreSQL client error');
  });

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
  };
}

function initializePools(): void {
  if (managedPool) return;

  writePoolWrapper = createPool('write-primary', 'write', dbConfig.maxPoolSize);
  const readPool = createPool('read-default', 'read', dbConfig.readPoolSize);
  readPoolWrappers = [readPool];
  managedPool = createManagedPool(writePoolWrapper, readPoolWrappers);
}

function createManagedPool(
  writePool: PoolWrapper,
  readPools: PoolWrapper[],
): ManagedPostgresPool {
  if (process.env.ZERO_FOOTPRINT === 'true') {
    logger.warn('ZERO_FOOTPRINT mode active: PostgreSQL queries will not be persisted.');
    const mockExecutor: QueryExecutor = async () => {
      logger.debug('Zero-Footprint: Skipping query execution');
      return { rowCount: 0, rows: [], command: 'MOCK', oid: 0, fields: [] };
    };
    return {
      query: mockExecutor,
      read: mockExecutor,
      write: mockExecutor,
      transaction: async (cb) => { throw new Error('Transactions not supported in ZERO_FOOTPRINT'); },
      withTransaction: async (cb) => { throw new Error('Transactions not supported in ZERO_FOOTPRINT'); },
      connect: async () => { throw new Error('Connect not supported in ZERO_FOOTPRINT'); },
      end: async () => { },
      on: () => ({} as any),
      healthCheck: async () => [],
      slowQueryInsights: () => [],
      pool: writePool.pool,
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

  const connect = async (): Promise<PoolClient> => writePool.pool.connect();

  const withTransaction = async <T>(callback: TransactionCallback<T>): Promise<T> => {
    const client = await connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
    return Promise.all(
      pools.map(async (wrapper) => {
        const snapshot: PoolHealthSnapshot = {
          name: wrapper.name,
          type: wrapper.type,
          circuitState: wrapper.circuitBreaker.getState(),
          healthy: true,
          activeConnections: (wrapper.pool.totalCount ?? 0) - (wrapper.pool.idleCount ?? 0),
          idleConnections: wrapper.pool.idleCount ?? 0,
          queuedRequests: wrapper.pool.waitingCount ?? 0,
          totalConnections: wrapper.pool.totalCount ?? 0,
        };
        try {
          const client = await wrapper.pool.connect();
          try {
            await client.query('SELECT 1');
          } finally {
            client.release();
          }
        } catch (error) {
          snapshot.healthy = false;
          snapshot.lastError = (error as Error).message;
        }
        return snapshot;
      }),
    );
  };

  const slowQueryInsights = (): SlowQueryInsight[] => {
    return Array.from(slowQueryStats.entries()).map(([key, value]) => ({
      key,
      pool: value.pool,
      executions: value.count,
      avgDurationMs: value.totalDuration / Math.max(value.count, 1),
      maxDurationMs: value.maxDuration,
    })).sort((a, b) => b.maxDurationMs - a.maxDurationMs);
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
  const poolCandidates = desiredType === 'write' ? [writePool] : [...readPools, writePool];
  const timeoutMs = options.timeoutMs ?? dbConfig.statementTimeoutMs;
  const label = options.label ?? 'postgres-query';

  let lastError: Error | undefined;
  for (const candidate of poolCandidates) {
    if (!candidate.circuitBreaker.canExecute()) {
      lastError = candidate.circuitBreaker.getLastError();
      continue;
    }
    try {
      const client = await candidate.pool.connect();
      try {
        const start = performance.now();
        const result = await client.query({
          text: normalized.text,
          values: normalized.values,
          name: normalized.name,
        });
        const duration = performance.now() - start;
        if (duration >= dbConfig.slowQueryThresholdMs) {
          recordSlowQuery(normalized.name, duration, candidate.name);
        }
        candidate.circuitBreaker.recordSuccess();
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error as Error;
      candidate.circuitBreaker.recordFailure(lastError);
    }
  }
  throw lastError ?? new Error('PostgreSQL execution failed');
}

function normalizeQuery(query: QueryInput, params?: any[]) {
  if (typeof query === 'string') {
    return { text: query, values: params ?? [], name: getPreparedStatementName(query) };
  }
  return {
    text: query.text,
    values: query.values ?? params ?? [],
    name: query.name ?? getPreparedStatementName(query.text),
  };
}

function getPreparedStatementName(text: string) {
  const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
  return `stmt_${hash}`;
}

function recordSlowQuery(name: string, duration: number, pool: string) {
  const key = `${pool}:${name}`;
  const entry = slowQueryStats.get(key) || { count: 0, totalDuration: 0, maxDuration: 0, pool };
  entry.count++;
  entry.totalDuration += duration;
  entry.maxDuration = Math.max(entry.maxDuration, duration);
  slowQueryStats.set(key, entry);
}

export const getPostgresPool = (): ManagedPostgresPool => {
  if (!managedPool) initializePools();
  return managedPool!;
};

export const closePostgresPool = async (): Promise<void> => {
  if (managedPool) await managedPool.end();
};
