import { Pool } from 'pg';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

const POSTGRES_HOST = process.env.POSTGRES_HOST || 'postgres';
const POSTGRES_USER = process.env.POSTGRES_USER || 'intelgraph';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'devpassword';
const POSTGRES_DB = process.env.POSTGRES_DB || 'intelgraph_dev';
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);

let pool: Pool;

export function getPostgresPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: POSTGRES_HOST,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: POSTGRES_DB,
      port: POSTGRES_PORT,
    });
    logger.info('PostgreSQL pool initialized.');
  }
  return pool;
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('PostgreSQL pool closed.');
    pool = null; // Clear the pool instance
  }
}