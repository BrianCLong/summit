
import config from '../config/index.js';

export const dbConfig = {
  connectionConfig: {
    host: config.postgres.host || 'localhost',
    port: parseInt(String(config.postgres.port || '5432')),
    database: config.postgres.database || 'postgres',
    user: config.postgres.username || 'postgres',
    password: config.postgres.password || 'postgres',
    ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
  },
  idleTimeoutMs: 10000,
  connectionTimeoutMs: 5000,
  maxPoolSize: 20,
  readPoolSize: 5,
  statementTimeoutMs: 30000,
  slowQueryThresholdMs: Number.parseInt(
    process.env.SLOW_QUERY_MS ?? '250',
    10,
  ),
};
