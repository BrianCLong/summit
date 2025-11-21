import { Pool } from 'pg';
import { config } from '../config.js';

let pool: Pool | undefined;

export function getPgPool(): Pool {
  if (!pool) {
    pool = new Pool(config.database.postgres);
  }
  return pool;
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
