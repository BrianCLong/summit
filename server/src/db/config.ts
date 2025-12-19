type ConnectionConfig = {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

export type DbConfig = {
  connectionConfig: ConnectionConfig;
  maxPoolSize: number;
  readPoolSize: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  statementTimeoutMs: number;
  slowQueryThresholdMs: number;
};

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING;

export const dbConfig: DbConfig = {
  connectionConfig: {
    connectionString,
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? '5432'),
    user: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_DB ?? process.env.POSTGRES_DATABASE ?? 'postgres',
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  maxPoolSize: Number(process.env.PG_POOL_MAX ?? process.env.PG_MAX_POOL ?? '20'),
  readPoolSize: Number(process.env.PG_READ_POOL_SIZE ?? '10'),
  idleTimeoutMs: Number(process.env.PG_IDLE_TIMEOUT_MS ?? '30000'),
  connectionTimeoutMs: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? '5000'),
  statementTimeoutMs: Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? '30000'),
  slowQueryThresholdMs: Number(process.env.PG_SLOW_QUERY_MS ?? '2000'),
};

export default dbConfig;
