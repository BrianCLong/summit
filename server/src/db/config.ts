import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const dbConfigSchema = z.object({
  host: z.string().default('postgres'),
  port: z.coerce.number().default(5432),
  user: z.string().default('intelgraph'),
  password: z.string().default('devpassword'),
  database: z.string().default('intelgraph_dev'),
  ssl: z.boolean().default(false),
  url: z.string().optional(),

  // Pool settings
  minPoolSize: z.coerce.number().default(2),
  maxPoolSize: z.coerce.number().default(20), // Write pool
  readPoolSize: z.coerce.number().default(5),
  idleTimeoutMs: z.coerce.number().default(30000),
  connectionTimeoutMs: z.coerce.number().default(5000),

  // Advanced
  statementTimeoutMs: z.coerce.number().default(30000), // 30s
  slowQueryThresholdMs: z.coerce.number().default(1000), // 1s
});

function loadConfig() {
  const isProd = process.env.NODE_ENV === 'production';

  // Prioritize DATABASE_URL
  const rawConfig = {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: isProd ? true : process.env.DB_SSL === 'true',
    url: process.env.DATABASE_URL,

    maxPoolSize: process.env.PG_WRITE_POOL_SIZE,
    readPoolSize: process.env.PG_READ_POOL_SIZE,
    slowQueryThresholdMs: process.env.PG_SLOW_QUERY_THRESHOLD_MS,
  };

  const parsed = dbConfigSchema.parse(rawConfig);

  // Derived connection config object for pg.Pool
  const connectionConfig = parsed.url
    ? { connectionString: parsed.url }
    : {
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
      };

  return {
    ...parsed,
    connectionConfig: {
      ...connectionConfig,
      ssl: parsed.ssl ? { rejectUnauthorized: true } : false,
    }
  };
}

export const dbConfig = loadConfig();
