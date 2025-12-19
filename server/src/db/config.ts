import type { PoolConfig } from 'pg';

type Env = NodeJS.ProcessEnv;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const parseBool = (value: string | undefined): boolean =>
  value === '1' || value?.toLowerCase() === 'true';

const buildConnectionConfig = (env: Env): PoolConfig => {
  if (env.DATABASE_URL) {
    return { connectionString: env.DATABASE_URL };
  }

  const isProduction = env.NODE_ENV === 'production';
  const password = env.POSTGRES_PASSWORD;

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
    host: env.POSTGRES_HOST || 'postgres',
    user: env.POSTGRES_USER || 'intelgraph',
    password: password || 'devpassword',
    database: env.POSTGRES_DB || 'intelgraph_dev',
    port: parseInt(env.POSTGRES_PORT || '5432', 10),
  };
};

export interface DbPoolConfig {
  tuningEnabled: boolean;
  connectionConfig: PoolConfig;
  maxPoolSize: number;
  readPoolSize: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  maxLifetimeSeconds?: number;
  maxUses?: number;
  statementTimeoutMs: number;
  idleInTransactionTimeoutMs: number;
  lockTimeoutMs: number;
  monitorIntervalMs: number;
  slowQueryThresholdMs: number;
}

export function buildDbConfig(env: Env = process.env): DbPoolConfig {
  const tuningEnabled = parseBool(env.DB_POOL_TUNING || env.DB_TUNING_FLAG);

  const defaultWriteSize = 20;
  const defaultReadSize = 30;

  const maxPoolSize = clamp(
    parseInt(
      env.PG_WRITE_POOL_SIZE || env.DB_POOL_MAX || `${defaultWriteSize}`,
      10,
    ),
    2,
    200,
  );

  const readPoolSize = clamp(
    parseInt(
      env.PG_READ_POOL_SIZE ||
        env.DB_POOL_READ_MAX ||
        env.DB_POOL_MAX ||
        `${defaultReadSize}`,
      10,
    ),
    2,
    200,
  );

  const idleTimeoutMs = parseInt(
    env.DB_POOL_IDLE_TIMEOUT_MS || env.DB_POOL_IDLE_TIMEOUT || '30000',
    10,
  );

  const connectionTimeoutMs = parseInt(
    env.DB_POOL_CONNECTION_TIMEOUT_MS ||
      env.DB_CONNECTION_TIMEOUT_MS ||
      '5000',
    10,
  );

  const maxLifetimeSeconds = tuningEnabled
    ? parseInt(env.DB_POOL_MAX_LIFETIME_SECONDS || '900', 10)
    : undefined;

  const maxUses = tuningEnabled
    ? parseInt(env.DB_POOL_MAX_USES || '5000', 10)
    : undefined;

  const statementTimeoutMs = parseInt(
    env.DB_STATEMENT_TIMEOUT_MS || (tuningEnabled ? '15000' : '0'),
    10,
  );

  const idleInTransactionTimeoutMs = parseInt(
    env.DB_IDLE_IN_TX_TIMEOUT_MS || (tuningEnabled ? '5000' : '0'),
    10,
  );

  const lockTimeoutMs = parseInt(
    env.DB_LOCK_TIMEOUT_MS || (tuningEnabled ? '5000' : '0'),
    10,
  );

  const monitorIntervalMs = parseInt(
    env.DB_POOL_MONITOR_INTERVAL_MS || '15000',
    10,
  );

  const slowQueryThresholdMs = parseInt(
    env.DB_SLOW_QUERY_THRESHOLD_MS || '500',
    10,
  );

  return {
    tuningEnabled,
    connectionConfig: buildConnectionConfig(env),
    maxPoolSize,
    readPoolSize,
    idleTimeoutMs,
    connectionTimeoutMs,
    maxLifetimeSeconds,
    maxUses,
    statementTimeoutMs,
    idleInTransactionTimeoutMs,
    lockTimeoutMs,
    monitorIntervalMs,
    slowQueryThresholdMs,
  };
}

export let dbConfig = buildDbConfig();

export const refreshDbConfig = (env: Env = process.env): DbPoolConfig => {
  dbConfig = buildDbConfig(env);
  return dbConfig;
};
