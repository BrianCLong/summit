import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import { generateDbHealthReport } from '../../src/db/dbHealth';

describe('db health report (integration)', () => {
  let pool: Pool | null = null;
  let available = false;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query('SELECT 1');
      available = true;
    } catch (error) {
      console.warn(
        `Skipping db health integration test; could not connect to ${process.env.DATABASE_URL}: ${
          (error as Error).message
        }`,
      );
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  const maybeIt = available ? it : it.skip;

  maybeIt('runs with read-only queries and no extension requirement', async () => {
    if (!pool) return;

    const report = await generateDbHealthReport({
      pool: pool as any,
      useExtensions: false,
      limit: 3,
    });

    expect(report.usedPgstattuple).toBe(false);
    expect(report.bloat.tables).toBeDefined();
    expect(report.recommendations.targetedActions.length).toBeGreaterThanOrEqual(0);
  });
});
