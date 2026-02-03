import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Pool } from 'pg';
import {
  buildCreateIndexSql,
  buildDropIndexSql,
} from '../../src/db/migrations/indexing.js';
import { MigrationManager } from '../../src/db/migrations/versioning.js';

// testcontainers typings expect NodeNext resolution; fall back to require to keep Jest CommonJS happy
// eslint-disable-next-line @typescript-eslint/no-var-requires
let GenericContainer: any;
let containerImportError: Error | null = null;
try {
  ({ GenericContainer } = require('testcontainers'));
} catch (error) {
  containerImportError = error as Error;
  GenericContainer = null;
}

const maybe = GenericContainer ? describe : describe.skip;

maybe('MigrationManager concurrent index support', () => {
  jest.setTimeout(120000);

  let container: any;
  let startError: Error | null = containerImportError;
  let tempDir: string;
  let migrationsDir: string;
  let seedsDir: string;
  let pool: Pool;
  let indexName: string;
  let originalPostgresUrl: string | undefined;
  let originalFlag: string | undefined;

  beforeAll(async () => {
    if (!GenericContainer) {
      return;
    }

    originalPostgresUrl = process.env.POSTGRES_URL;
    originalFlag = process.env.INDEX_CONCURRENT;

    try {
      container = await new GenericContainer('postgres:15-alpine')
        .withEnv('POSTGRES_PASSWORD', 'postgres')
        .withEnv('POSTGRES_USER', 'postgres')
        .withEnv('POSTGRES_DB', 'postgres')
        .withExposedPorts(5432)
        .start();
    } catch (error) {
      startError = error as Error;
      return;
    }

    const connectionString = `postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(5432)}/postgres`;
    process.env.POSTGRES_URL = connectionString;
    process.env.INDEX_CONCURRENT = '1';

    pool = new Pool({ connectionString });

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-migrations-'));
    migrationsDir = path.join(tempDir, 'migrations');
    seedsDir = path.join(tempDir, 'seeds');
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });

    const indexSql = buildCreateIndexSql({
      tableName: 'demo_items',
      columns: ['tenant_id', 'created_at'],
      predicate: "active = true AND tenant_id = 'tenant-1'",
      concurrently: true,
    });
    const dropSql = buildDropIndexSql({
      indexName: indexSql.name,
      concurrently: true,
    });
    indexName = indexSql.name;

    const upSql = `
CREATE TABLE IF NOT EXISTS demo_items (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN DEFAULT true
);
${indexSql.sql};
`;

    const downSql = `
${dropSql.sql};
DROP TABLE IF EXISTS demo_items;
`;

    fs.writeFileSync(
      path.join(migrationsDir, '202610010101_concurrent_index.up.sql'),
      upSql,
    );
    fs.writeFileSync(
      path.join(migrationsDir, '202610010101_concurrent_index.down.sql'),
      downSql,
    );
  });

  afterAll(async () => {
    process.env.POSTGRES_URL = originalPostgresUrl;
    process.env.INDEX_CONCURRENT = originalFlag;
    if (pool) await pool.end();
    if (container) await container.stop();
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('applies migrations and records concurrent index builds', async () => {
    if (startError) {
      console.warn('Skipping concurrent index integration test:', startError.message);
      return;
    }

    const manager = new MigrationManager({
      migrationsDir,
      seedsDir,
      pool,
    });

    await manager.migrate();

    const indexes = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'demo_items'`,
    );

    const createdIndex = indexes.rows.find(
      (row) => row.indexname === indexName,
    );

    expect(createdIndex).toBeDefined();
    expect(createdIndex?.indexdef).toContain('WHERE (active = true');

    const history = await pool.query(
      `SELECT status, attempts, concurrently FROM index_build_history WHERE index_name = $1`,
      [indexName],
    );

    expect(history.rows[0]).toMatchObject({
      status: 'succeeded',
      concurrently: true,
    });
    expect(history.rows[0].attempts).toBeGreaterThanOrEqual(1);
  });
});
