import * as dotenv from 'dotenv';

dotenv.config();

function parseConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'devpassword',
    database: process.env.POSTGRES_DB || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  };
}

const toInt = (value: string | undefined, fallback: number) =>
  Number.isNaN(parseInt(value || '', 10))
    ? fallback
    : parseInt(value || '', 10);

const connectionConfig = parseConnectionConfig();

export const dbConfig = {
  connectionConfig,
  host: (connectionConfig as any).host || 'localhost',
  maxPoolSize: toInt(process.env.PG_WRITE_POOL_SIZE, 24),
  readPoolSize: toInt(process.env.PG_READ_POOL_SIZE, 30),
  idleTimeoutMs: toInt(process.env.PG_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMs: toInt(process.env.PG_CONNECTION_TIMEOUT_MS, 5_000),
  statementTimeoutMs: toInt(process.env.PG_WRITE_TIMEOUT_MS, 30_000),
  slowQueryThresholdMs: toInt(process.env.PG_SLOW_QUERY_THRESHOLD_MS, 2_000),
};

export type DbConfig = typeof dbConfig;
