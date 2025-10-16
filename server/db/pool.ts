import { Pool } from 'pg';
export const pool = new Pool({
  max: Number(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
