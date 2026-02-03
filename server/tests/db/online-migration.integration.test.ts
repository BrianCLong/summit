import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { randomUUID } from 'crypto';
import { newDb } from 'pg-mem';
import {
  migrationMetricsRegistry,
  resetMigrationMetrics,
  USERS_DISPLAY_NAME_MIGRATION_KEY,
  buildDisplayNameDualWriter,
  runExampleDisplayNameMigration,
} from '../../src/db/online-migrations';

describe('online migration example', () => {
  beforeEach(() => {
    resetMigrationMetrics();
  });

  it('runs expand/backfill/parity and marks contract-ready', async () => {
    const db = newDb({ noAstCoverageCheck: true });
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();

    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY,
        display_name TEXT NOT NULL,
        display_name_canonical TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const writer = buildDisplayNameDualWriter(pool);
    const idOne = randomUUID();
    const idTwo = randomUUID();

    await pool.query(
      `INSERT INTO users (id, display_name, created_at) VALUES ($1, $2, now()), ($3, $4, now())`,
      [idOne, 'Initial User', idTwo, 'Second User'],
    );

    await writer.write({ userId: idOne, displayName: 'Grace Hopper' });

    const parityResult = await runExampleDisplayNameMigration(pool);
    expect(parityResult.mismatches).toBe(0);

    const stored = await pool.query(
      `SELECT display_name, display_name_canonical FROM users ORDER BY display_name`,
    );
    expect(stored.rows).toEqual(
      expect.arrayContaining([
        { display_name: 'Grace Hopper', display_name_canonical: 'Grace Hopper' },
        { display_name: 'Second User', display_name_canonical: 'Second User' },
      ]),
    );

    const phase = await pool.query(
      `SELECT phase, metadata FROM online_migration_runs WHERE migration_key = $1`,
      [USERS_DISPLAY_NAME_MIGRATION_KEY],
    );
    expect(phase.rows[0].phase).toBe('contract-ready');
    const metadata = phase.rows[0].metadata || {};
    expect(metadata.mismatches ?? metadata.parityResult?.mismatches ?? 0).toBe(0);

    const metrics = await migrationMetricsRegistry.metrics();
    expect(metrics).toContain('online_migration_backfill_processed_total');
    expect(metrics).toContain('online_migration_parity_samples_total');

    await pool.end();
  });
});
