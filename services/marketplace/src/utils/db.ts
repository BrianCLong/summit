// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 16): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'postgres'];
  if (insecureValues.some(v => value.toLowerCase().includes(v))) {
    console.error(`FATAL: ${name} is set to an insecure default value`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'intelgraph',
  user: process.env.POSTGRES_USER || 'postgres',
  password: requireSecret('POSTGRES_PASSWORD', process.env.POSTGRES_PASSWORD, 16),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

export const db = {
  query: async (text: string, params?: unknown[]) => {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      logger.warn('Slow query', { text, duration, rows: result.rowCount });
    }

    return result;
  },

  getClient: async () => {
    const client = await pool.connect();
    return client;
  },

  // Transaction helper
  transaction: async <T>(
    fn: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
