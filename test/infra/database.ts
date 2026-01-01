/**
 * Test Infrastructure: Database Test Fixtures
 *
 * Problem: Tests that rely on shared database state interfere with each other.
 *
 * Solution: Create isolated database schema per test, with automatic cleanup.
 *
 * Usage:
 *   import { createTestDatabase, cleanupTestDatabase } from '../../test/infra/database';
 *
 *   let db: TestDatabase;
 *
 *   beforeEach(async () => {
 *     db = await createTestDatabase();
 *   });
 *
 *   afterEach(async () => {
 *     await cleanupTestDatabase(db);
 *   });
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { randomUUID } from 'crypto';

export interface TestDatabase {
  pool: Pool;
  schema: string;
  connectionString: string;
}

/**
 * Create a test database with isolated schema.
 *
 * This creates a new schema in the database, runs migrations, and returns
 * a connection pool scoped to that schema.
 *
 * @param config - Optional pool configuration (defaults to DATABASE_URL env var)
 * @returns Test database instance
 */
export async function createTestDatabase(
  config?: PoolConfig
): Promise<TestDatabase> {
  const schema = `test_${randomUUID().replace(/-/g, '_')}`;
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/summit_test';

  // Create pool without schema (for setup)
  const setupPool = new Pool(config || { connectionString });

  try {
    // Create schema
    await setupPool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    // Create pool with schema in search_path
    const pool = new Pool({
      ...(config || { connectionString }),
      options: `-c search_path=${schema},public`,
    });

    // Run migrations (if migration script exists)
    try {
      // Import and run migrations dynamically
      // Note: This assumes migrations are idempotent or schema-aware
      // In practice, you may need to customize this for your migration setup
      const { runMigrations } = await import('../../server/scripts/run-migrations.js').catch(
        () => ({ runMigrations: null })
      );

      if (runMigrations) {
        await runMigrations({ pool, schema });
      }
    } catch (err) {
      console.warn('Failed to run migrations (may not be implemented yet):', err);
    }

    return {
      pool,
      schema,
      connectionString,
    };
  } finally {
    await setupPool.end();
  }
}

/**
 * Clean up test database (truncate tables and drop schema).
 *
 * @param db - Test database instance
 */
export async function cleanupTestDatabase(db: TestDatabase): Promise<void> {
  if (!db || !db.pool) {
    return;
  }

  try {
    // Truncate all tables in schema (cascade to handle foreign keys)
    await db.pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '${db.schema}') LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop schema
    await db.pool.query(`DROP SCHEMA IF EXISTS ${db.schema} CASCADE`);
  } catch (err) {
    console.error('Failed to cleanup test database:', err);
  } finally {
    await db.pool.end();
  }
}

/**
 * Execute a query in a test database.
 *
 * @param db - Test database instance
 * @param query - SQL query
 * @param values - Query parameters
 * @returns Query result
 */
export async function query<T = any>(
  db: TestDatabase,
  query: string,
  values?: any[]
): Promise<T[]> {
  const result = await db.pool.query(query, values);
  return result.rows;
}

/**
 * Seed test data into a test database.
 *
 * @param db - Test database instance
 * @param table - Table name
 * @param data - Array of objects to insert
 */
export async function seedTestData<T extends Record<string, any>>(
  db: TestDatabase,
  table: string,
  data: T[]
): Promise<void> {
  if (data.length === 0) {
    return;
  }

  const columns = Object.keys(data[0]);
  const values = data.map((row) => columns.map((col) => row[col]));

  const placeholders = values
    .map((_, i) => {
      const offset = i * columns.length;
      return `(${columns.map((_, j) => `$${offset + j + 1}`).join(', ')})`;
    })
    .join(', ');

  const flatValues = values.flat();

  await db.pool.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
    flatValues
  );
}

/**
 * Get a client from the pool (for transactions).
 *
 * @param db - Test database instance
 * @returns Pool client (remember to release it!)
 */
export async function getClient(db: TestDatabase): Promise<PoolClient> {
  return db.pool.connect();
}

/**
 * Execute a function within a transaction (auto-rollback).
 *
 * This is useful for testing code that modifies the database, without
 * persisting changes.
 *
 * @param db - Test database instance
 * @param fn - Function to execute
 * @returns Result of function
 */
export async function withTransaction<T>(
  db: TestDatabase,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('ROLLBACK'); // Always rollback (test isolation)
    return result;
  } finally {
    client.release();
  }
}
