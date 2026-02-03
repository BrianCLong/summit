import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import type { QueryConfig } from 'pg';
import {
  buildCandidateQuery,
  purgeTarget,
  type PurgeTarget,
} from '../src/jobs/purgeStaleData.js';

type QueryInput = string | QueryConfig;

class RecordingClient {
  public calls: QueryConfig[] = [];
  constructor(private readonly selectRows: Record<string, unknown>[]) {}

  async query(config: QueryInput) {
    const normalized: QueryConfig = typeof config === 'string' ? { text: config } : config;
    this.calls.push(normalized);

    if (normalized.text?.toUpperCase().startsWith('SELECT')) {
      return { rows: this.selectRows, rowCount: this.selectRows.length };
    }

    if (normalized.text?.toUpperCase().startsWith('UPDATE')) {
      const values = normalized.values ?? [];
      const ids = values[values.length - 1];
      return { rows: [], rowCount: Array.isArray(ids) ? ids.length : 0 };
    }

    const ids = (normalized.values?.[0] as unknown[]) ?? [];
    return { rows: [], rowCount: ids.length };
  }
}

describe('buildCandidateQuery', () => {
  it('applies expiry, retention, and batch limits defensively', () => {
    const target: PurgeTarget = {
      name: 'audit-logs',
      table: 'audit_logs',
      idColumn: 'id',
      timestampColumn: 'timestamp',
      expiresColumn: 'retention_expires_at',
      retentionDays: 90,
      action: 'delete',
    };

    const now = new Date('2025-01-01T00:00:00Z');
    const query = buildCandidateQuery(target, now, 50);

    expect(query.text).toContain('retention_expires_at');
    expect(query.text).toContain('timestamp');
    expect(query.values?.[0]).toEqual(now);
    expect(query.values?.[1]).toEqual(new Date('2024-10-03T00:00:00.000Z'));
    expect(query.values?.[2]).toBe(50);
  });
});

describe('purgeTarget', () => {
  it('returns a dry-run summary without mutating data', async () => {
    const client = new RecordingClient([{ id: 'a-1' }, { id: 'a-2' }]);
    const target: PurgeTarget = {
      name: 'copilot-events',
      table: 'copilot_events',
      idColumn: 'id',
      timestampColumn: 'created_at',
      expiresColumn: 'expires_at',
      retentionDays: 30,
      action: 'delete',
    };

    const result = await purgeTarget(client as any, target, {
      dryRun: true,
      now: new Date('2025-02-01T00:00:00Z'),
      maxBatchSize: 10,
    });

    expect(result.dryRun).toBe(true);
    expect(result.matched).toBe(2);
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].text).toContain('SELECT');
  });

  it('anonymizes eligible runs when retention has elapsed', async () => {
    const client = new RecordingClient([{ id: 'run-1' }, { id: 'run-2' }]);
    const target: PurgeTarget = {
      name: 'copilot-runs-metadata',
      table: 'copilot_runs',
      idColumn: 'id',
      timestampColumn: 'finished_at',
      retentionDays: 180,
      predicate: "status IN ('succeeded', 'failed', 'paused')",
      action: 'anonymize',
      anonymize: {
        goal_text: '[anonymized after retention]',
        plan: {},
        metadata: {},
      },
    };

    const result = await purgeTarget(client as any, target, {
      dryRun: false,
      now: new Date('2025-06-01T00:00:00Z'),
      maxBatchSize: 25,
    });

    expect(result.anonymized).toBe(2);
    expect(client.calls).toHaveLength(2);
    const updateCall = client.calls.find((call) => call.text?.startsWith('UPDATE'));
    expect(updateCall?.values?.slice(0, 3)).toEqual([
      '[anonymized after retention]',
      {},
      {},
    ]);
    expect(updateCall?.values?.[3]).toEqual(['run-1', 'run-2']);
  });
});
