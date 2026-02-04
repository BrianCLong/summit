/* eslint-disable @typescript-eslint/no-var-requires */
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { AuditTimelineRollupService } from '../src/audit/AuditTimelineRollupService.js';

// Use process.cwd() since tests run from server directory
const testsDir = process.cwd();

let GenericContainer: any;
try {
  ({ GenericContainer } = require('testcontainers'));
} catch (_) {
  // testcontainers not available; tests will be skipped
}

const supportsEnv =
  GenericContainer &&
  (typeof GenericContainer.prototype?.withEnv === 'function' ||
    typeof GenericContainer.prototype?.withEnvironment === 'function') &&
  typeof GenericContainer.prototype?.withExposedPorts === 'function';
const runIntegration = process.env.RUN_AUDIT_TIMELINE === 'true';
const maybe = supportsEnv && runIntegration ? describe : describe.skip;

interface PlanNode {
  'Node Type': string;
  'Index Name'?: string;
  Plans?: PlanNode[];
}

maybe('Audit timeline BRIN + rollups', () => {
  let container: any;
  let pool: Pool;
  let rollups: AuditTimelineRollupService;
  const migrationSql = fs.readFileSync(
    path.join(testsDir, 'db/migrations/postgres/2026-11-05_timeline_rollups_brin.sql'),
    'utf8',
  );

  const seedEvents = async (
    tenantId: string,
    count: number,
    anchor: Date,
    offsetMinutes = 1,
  ) => {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (let i = 0; i < count; i++) {
      const ts = new Date(anchor.getTime() - i * offsetMinutes * 60000);
      placeholders.push(
        `($${values.length + 1}, $${values.length + 2}, $${values.length + 3}, $${values.length + 4}, $${values.length + 5}, $${values.length + 6})`,
      );
      values.push(
        tenantId,
        'login',
        'info',
        'audit-service',
        ts.toISOString(),
        `event-${tenantId}-${i}`,
      );
    }
    await pool.query(
      `
      INSERT INTO audit_events (
        tenant_id, event_type, level, service_id, "timestamp", message
      ) VALUES ${placeholders.join(',')}
    `,
      values,
    );
  };

  beforeAll(async () => {
    const containerBuilder = new GenericContainer('postgres:15-alpine');
    if (typeof containerBuilder.withEnv === 'function') {
      containerBuilder
        .withEnv('POSTGRES_PASSWORD', 'postgres')
        .withEnv('POSTGRES_DB', 'auditdb');
    } else if (typeof containerBuilder.withEnvironment === 'function') {
      containerBuilder
        .withEnvironment('POSTGRES_PASSWORD', 'postgres')
        .withEnvironment('POSTGRES_DB', 'auditdb');
    }

    container = await containerBuilder.withExposedPorts(5432).start();

    const port = container.getMappedPort(5432);
    const host = container.getHost();
    pool = new Pool({
      host,
      port,
      user: 'postgres',
      password: 'postgres',
      database: 'auditdb',
    });

    await pool.query(`
      CREATE TABLE audit_events (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        level TEXT NOT NULL,
        service_id TEXT,
        "timestamp" TIMESTAMPTZ NOT NULL,
        message TEXT
      );
    `);

    await pool.query(migrationSql);
    rollups = new AuditTimelineRollupService(pool);
    process.env.TIMELINE_ROLLUPS_V1 = '1';
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    if (!pool) return;
    await pool.query('TRUNCATE audit_events RESTART IDENTITY;');
    await pool.query(
      'TRUNCATE audit_event_rollups_daily, audit_event_rollups_weekly, audit_event_rollup_state;',
    );
  });

  it('uses BRIN index for time-bounded queries', async () => {
    const now = new Date();
    await seedEvents('tenant-a', 240, now);
    await seedEvents('tenant-b', 240, now);

    await pool.query('SET enable_seqscan = off;');
    const planResult = (await pool.query(
      `
      EXPLAIN (FORMAT JSON)
      SELECT *
      FROM audit_events
      WHERE tenant_id = $1
        AND "timestamp" >= $2
        AND "timestamp" < $3
      ORDER BY "timestamp" DESC
    `,
      [ 'tenant-a', new Date(now.getTime() - 3600 * 1000), now ],
    )) as { rows: Array<{ 'QUERY PLAN': Array<{ Plan: PlanNode }> }> };

    const rootPlan = planResult.rows[0]['QUERY PLAN'][0].Plan;
    const indexNode = findPlanNode(
      rootPlan,
      (node) =>
        node['Node Type'] === 'Bitmap Index Scan' &&
        node['Index Name'] === 'idx_audit_events_brin_tenant_timestamp',
    );

    expect(indexNode).toBeTruthy();
  });

  it('refreshes rollups incrementally and serves reads via flag', async () => {
    const anchor = new Date();
    await seedEvents('tenant-a', 40, anchor, 2);

    const firstWindowEnd = new Date(anchor.getTime() + 5 * 60000);
    const firstRun = await rollups.refreshRollups({ to: firstWindowEnd });
    expect(firstRun.processedEvents).toBeGreaterThan(0);

    const firstBuckets = await rollups.getTimelineBuckets({
      rangeStart: new Date(anchor.getTime() - 3600 * 1000),
      rangeEnd: new Date(anchor.getTime() + 3600 * 1000),
      granularity: 'day',
      tenantId: 'tenant-a',
    });

    const initialCount =
      firstBuckets.find((b) => b.tenantId === 'tenant-a')?.eventCount || 0;
    expect(initialCount).toBe(40);

    await seedEvents('tenant-a', 10, new Date(firstWindowEnd.getTime() + 60000));
    const secondWindowEnd = new Date(firstWindowEnd.getTime() + 30 * 60000);
    await rollups.refreshRollups({ to: secondWindowEnd });

    const secondBuckets = await rollups.getTimelineBuckets({
      rangeStart: new Date(anchor.getTime() - 3600 * 1000),
      rangeEnd: new Date(anchor.getTime() + 2 * 3600 * 1000),
      granularity: 'day',
      tenantId: 'tenant-a',
    });

    const updatedCount =
      secondBuckets.find((b) => b.tenantId === 'tenant-a')?.eventCount || 0;
    expect(updatedCount).toBe(50);

    const state = await pool.query(
      `SELECT last_processed_at, last_run_status FROM audit_event_rollup_state WHERE rollup_name = 'audit_events'`,
    );
    expect(state.rows[0].last_run_status).toBe('ok');
    expect(new Date(state.rows[0].last_processed_at).getTime()).toBeCloseTo(
      secondWindowEnd.getTime(),
      -1,
    );
  });
});

function findPlanNode(
  node: PlanNode,
  predicate: (node: PlanNode) => boolean,
): PlanNode | null {
  if (predicate(node)) return node;
  if (!node.Plans) return null;
  for (const child of node.Plans) {
    const found = findPlanNode(child, predicate);
    if (found) return found;
  }
  return null;
}
