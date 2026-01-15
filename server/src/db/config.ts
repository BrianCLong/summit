
import { cfg } from '../config.js';

export const dbConfig = {
  connectionConfig: {
    connectionString: cfg.DATABASE_URL,
    ssl: cfg.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  idleTimeoutMs: 10000,
  connectionTimeoutMs: 5000,
  maxPoolSize: parseInt(process.env.PG_WRITE_POOL_SIZE || '20', 10),
  readPoolSize: parseInt(process.env.PG_READ_POOL_SIZE || '5', 10),
  statementTimeoutMs: 30000,
  slowQueryThresholdMs: Number.parseInt(
    process.env.SLOW_QUERY_MS ?? '250',
    10,
  ),
};
