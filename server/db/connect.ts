import { Client } from 'pg';
import { buildRdsAuthToken } from './iam.js';

export async function getConn() {
  const dbConfig: any = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
  };

  if (process.env.DB_AUTH_MODE === 'iam') {
    console.log('Using IAM authentication for database connection');
    try {
      const token = await buildRdsAuthToken(
        process.env.DB_HOST!,
        process.env.DB_USER!
      );
      dbConfig.password = token;
      dbConfig.ssl = { rejectUnauthorized: false }; // Required for RDS IAM auth
    } catch (error) {
      console.error('Failed to get IAM token, falling back to password auth:', error);
      dbConfig.password = process.env.DB_PASSWORD;
    }
  } else {
    dbConfig.password = process.env.DB_PASSWORD;
  }

  const client = new Client(dbConfig);
  await client.connect();
  return client;
}

// Connection pool version
import { Pool } from 'pg';

let pool: Pool;

export function getPool() {
  if (!pool) {
    const poolConfig: any = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      max: parseInt(process.env.DB_POOL_SIZE || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    if (process.env.DB_AUTH_MODE === 'iam') {
      // For IAM auth with connection pool, we need to handle token refresh
      poolConfig.password = () => buildRdsAuthToken(
        process.env.DB_HOST!,
        process.env.DB_USER!
      );
      poolConfig.ssl = { rejectUnauthorized: false };
    } else {
      poolConfig.password = process.env.DB_PASSWORD;
    }

    pool = new Pool(poolConfig);
  }
  
  return pool;
}