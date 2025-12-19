// @ts-nocheck
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Pool, QueryConfig, QueryResult, PoolClient } from 'pg';
import { dbConfig } from './config.js';
import baseLogger from '../config/logger.js';

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
  transaction: <T>(callback: TransactionCallback<T>) => Promise<T>; // Alias for withTransaction
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

interface PoolWrapper {
  name: string;
  type: 'write' | 'read';
  pool: Pool;
  circuitBreaker: CircuitBreaker;
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

const preparedStatementCache = new Map<string, string>();
const slowQueryStats = new Map<
  string,
  { count: number; totalDuration: number; maxDuration: number; pool: string }
>();

let writePoolWrapper: PoolWrapper | null = null;
let readPoolWrappers: PoolWrapper[] = [];
let managedPool: ManagedPostgresPool | null = null;
let readReplicaCursor = 0;

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

  const isProduction = process.env.NODE_ENV === 'production';
  const password = process.env.POSTGRES_PASSWORD;

  if (isProduction) {
    if (!password) {
      throw new Error(
        'POSTGRES_PASSWORD environment variable is required in production',
      );
    }
    if (password === 'devpassword') {
      throw new Error(
        'Security Error: POSTGRES_PASSWORD cannot be the default "devpassword" in production',
      );
    }
  }

  return {
    host: process.env.POSTGRES_HOST || 'postgres',
    user: process.env.POSTGRES_USER || 'intelgraph',
    password: password || 'devpassword',
    database: process.env.POSTGRES_DB || 'intelgraph_dev',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  };
}

function parseReadReplicaUrls(): string[] {
  const explicit = (process.env.DATABASE_READ_REPLICAS || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const legacy = process.env.DATABASE_READ_URL
    ? [process.env.DATABASE_READ_URL]
    : [];

  return [...new Set([...explicit, ...legacy])];
}

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
  };
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
    return writePool.pool.connect();
  };

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
  let delay = 40; // Base delay

  while (attempt <= 3) {
    try {
        const client = await wrapper.pool.connect();
        try {
            return await executeQueryOnClient(client, normalizedQuery, wrapper, label, timeoutMs);
        } finally {
            client.release();
        }
    } catch (error) {
      const err = error as Error;
      wrapper.circuitBreaker.recordFailure(err);

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
  timeoutMs: number
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
  CircuitBreaker,
};
