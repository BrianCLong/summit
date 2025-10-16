import { ProvenanceRepo } from '../src/repos/ProvenanceRepo.js';

class FakeClient {
  private responses: Array<{ match: RegExp; result: any; error?: boolean }> =
    [];
  lastSql = '';
  addResponse(match: RegExp, result: any, error = false) {
    this.responses.push({ match, result, error });
  }
  async query(sql: string, _params: any[]) {
    this.lastSql = sql;
    const hit = this.responses.find((r) => r.match.test(sql));
    if (!hit) throw new Error('no mock for sql');
    if (hit.error) throw new Error('forced error');
    return hit.result;
  }
  release() {}
}

class FakePool {
  client: any;
  constructor(client: any) {
    this.client = client;
  }
  async connect() {
    return this.client;
  }
}

describe('ProvenanceRepo', () => {
  test('maps classic audit_events rows', async () => {
    const client = new FakeClient();
    const now = new Date();
    client.addResponse(/FROM audit_events .*target_type/, {
      rows: [
        {
          id: 'r1',
          action: 'policy',
          target_type: 'incident',
          target_id: 'inc1',
          metadata: { reasonCode: 'POLICY_DENY' },
          created_at: now,
        },
      ],
    });
    const pool = new FakePool(client) as any;
    const repo = new ProvenanceRepo(pool);
    const rows = await repo.by(
      'incident',
      'inc1',
      undefined,
      10,
      0,
      'tenant-1',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'r1', kind: 'policy' });
    expect(new Date(rows[0].createdAt).toISOString()).toBe(now.toISOString());
    expect(rows[0].metadata.reasonCode).toBe('POLICY_DENY');
  });

  test('falls back to provenance table and maps fields', async () => {
    const client = new FakeClient();
    const now = new Date();
    // Force errors on audit_events queries to trigger fallback
    client.addResponse(/FROM audit_events .*target_type/, null, true);
    client.addResponse(/FROM audit_events .*resource_type/, null, true);
    client.addResponse(/FROM provenance /, {
      rows: [
        {
          id: 'p1',
          source: 'graphrag',
          subject_type: 'investigation',
          subject_id: 'inv1',
          note: 'note1',
          created_at: now,
        },
      ],
    });
    const pool = new FakePool(client) as any;
    const repo = new ProvenanceRepo(pool);
    const rows = await repo.by(
      'investigation',
      'inv1',
      undefined,
      10,
      0,
      'tenant-1',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'p1', kind: 'graphrag' });
    expect(new Date(rows[0].createdAt).toISOString()).toBe(now.toISOString());
    expect(rows[0].metadata).toMatchObject({ note: 'note1' });
  });
});

test('includes filters in WHERE (contains + reasonCodeIn)', async () => {
  const client = new FakeClient();
  const now = new Date();
  client.addResponse(/FROM audit_events .*target_type/, { rows: [] });
  client.addResponse(/FROM audit_events .*resource_type/, {
    rows: [
      {
        id: 'r2',
        action: 'policy',
        resource_type: 'investigation',
        resource_id: 'inv1',
        resource_data: { reasonCode: 'RATE_LIMIT' },
        timestamp: now,
      },
    ],
  });
  const pool = new FakePool(client) as any;
  const repo = new ProvenanceRepo(pool);
  const rows = await repo.by(
    'investigation',
    'inv1',
    { contains: 'policy', reasonCodeIn: ['RATE_LIMIT'] },
    10,
    0,
    'tenant-1',
  );
  expect(rows.length).toBeGreaterThanOrEqual(0);
  // Ensure SQL had ILIKE and reasonCode filter
  expect(client.lastSql).toMatch(/ILIKE/);
  expect(client.lastSql).toMatch(/metadata->>'reasonCode'/);
});
