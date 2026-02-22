import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { EventSourcingService } from '../../services/EventSourcingService';

jest.setTimeout(120000);

describe('event_store partitioning', () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let runtimeAvailable = true;

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';

  beforeAll(async () => {
    try {
      container = await new GenericContainer('postgres:15-alpine')
        .withEnvironment({
          POSTGRES_DB: 'testdb',
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'testpassword',
        })
        .withExposedPorts(5432)
        .start();
    } catch (error: any) {
      runtimeAvailable = false;
      console.warn(
        'Skipping partitioning integration tests: container runtime unavailable',
        (error as Error).message,
      );
      return;
    }

    process.env.DB_PARTITIONS_V1 = '1';
    process.env.DB_PARTITION_MONTHS_AHEAD = '1';
    process.env.DB_PARTITION_RETENTION_MONTHS = '12';

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: 'postgres',
      password: 'testpassword',
      database: 'testdb',
    });

    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    const baseSql = fs.readFileSync(
      path.join(
        __dirname,
        '../../../db/migrations/postgres/2025-11-20_enhanced_audit_event_sourcing.sql',
      ),
      'utf8',
    );
    await pool.query(baseSql);

    const partitionSql = fs.readFileSync(
      path.join(
        __dirname,
        '../../../db/managed-migrations/202604090001_event_store_partitioning.up.sql',
      ),
      'utf8',
    );
    await pool.query(partitionSql);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
    if (container) {
      await container.stop();
    }
  });

  it('dual writes to legacy + partitioned tables and auto-creates tenant buckets', async () => {
    if (!runtimeAvailable) {
      expect(runtimeAvailable).toBe(false);
      return;
    }

    const service = new EventSourcingService(pool as any);
    const stored = await service.appendEvent({
      aggregateId: 'agg-1',
      aggregateType: 'case',
      eventData: { foo: 'bar' },
      eventType: 'created',
      tenantId: tenantA,
      userId: 'user-1',
    });

    const legacyCount = await pool.query(
      'SELECT COUNT(*) FROM event_store WHERE event_id = $1',
      [stored.eventId],
    );
    const partitionCount = await pool.query(
      'SELECT COUNT(*) FROM event_store_partitioned WHERE tenant_id = $1',
      [tenantA],
    );
    const partitions = await pool.query(
      `SELECT relname FROM pg_partition_tree('event_store_partitioned') WHERE level = 2 AND isleaf`,
    );

    expect(legacyCount.rows[0].count).toBe('1');
    expect(partitionCount.rows[0].count).toBe('1');
    expect(
      partitions.rows.some((r: any) =>
        (r.relname as string).startsWith('event_store_tenant_'),
      ),
    ).toBe(true);
  });

  it('routes tenant-scoped queries to matching partitions', async () => {
    if (!runtimeAvailable) {
      expect(runtimeAvailable).toBe(false);
      return;
    }

    const service = new EventSourcingService(pool as any);
    await service.appendEvent({
      aggregateId: 'agg-2',
      aggregateType: 'case',
      eventData: { foo: 'baz' },
      eventType: 'updated',
      tenantId: tenantB,
      userId: 'user-2',
    });

    const explain = await pool.query(
      `EXPLAIN (FORMAT TEXT)
       SELECT * FROM event_store_partitioned
       WHERE tenant_id = $1 AND event_timestamp >= NOW() - INTERVAL '1 day'`,
      [tenantB],
    );

    const planText = explain.rows
      .map((r: any) => r['QUERY PLAN'] as string)
      .join('\n');

    expect(planText).toMatch(/event_store_tenant_/);
  });

  it('exposes partition metrics and bounds', async () => {
    if (!runtimeAvailable) {
      expect(runtimeAvailable).toBe(false);
      return;
    }

    const metrics = await pool.query(
      `SELECT partition_name, total_pretty, bounds
       FROM event_store_partition_metrics
       ORDER BY total_bytes DESC`,
    );

    expect(metrics.rowCount).toBeGreaterThan(0);
    expect(metrics.rows[0]).toHaveProperty('bounds');
  });
});
