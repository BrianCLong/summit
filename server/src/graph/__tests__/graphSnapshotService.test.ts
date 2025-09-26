import neo4j from 'neo4j-driver';
import { gunzipSync } from 'node:zlib';
import { createGraphSnapshot, restoreGraphSnapshot } from '../graphSnapshotService.ts';

class FakeRecord {
  private readonly map: Record<string, any>;

  constructor(map: Record<string, any>) {
    this.map = map;
  }

  get(key: string) {
    return this.map[key];
  }
}

class FakeReadSession {
  private nodePage = 0;
  private relPage = 0;

  async run(query: string) {
    if (query.includes('RETURN id(n) as id')) {
      if (this.nodePage++ === 0) {
        return {
          records: [
            new FakeRecord({
              id: neo4j.int(1),
              labels: ['Person'],
              properties: {
                id: 'user-1',
                name: 'Alice',
                tenant_id: 'tenant-1',
                age: neo4j.int(30),
              },
            }),
            new FakeRecord({
              id: neo4j.int(2),
              labels: ['Person'],
              properties: {
                id: 'user-2',
                name: 'Bob',
                tenant_id: 'tenant-1',
                age: neo4j.int(32),
              },
            }),
          ],
        };
      }
      return { records: [] };
    }
    if (query.includes('RETURN id(r) as id')) {
      if (this.relPage++ === 0) {
        return {
          records: [
            new FakeRecord({
              id: neo4j.int(5),
              type: 'KNOWS',
              startId: neo4j.int(1),
              endId: neo4j.int(2),
              properties: { weight: neo4j.int(3) },
            }),
          ],
        };
      }
      return { records: [] };
    }
    return { records: [] };
  }

  async close() {
    return undefined;
  }
}

class FakeReadDriver {
  session() {
    return new FakeReadSession();
  }
}

class FakeWriteSession {
  public readonly calls: { query: string; params?: any }[] = [];
  private nextId = 100;
  public closed = false;

  async run(query: string, params: any = {}) {
    this.calls.push({ query, params });
    if (query.includes('RETURN id(n) as newId')) {
      const nodes = params.nodes || [];
      return {
        records: nodes.map((node: any) =>
          new FakeRecord({ newId: neo4j.int(this.nextId++), originalId: node.originalId }),
        ),
      };
    }
    return { records: [] };
  }

  async close() {
    this.closed = true;
  }
}

class FakeWriteDriver {
  public readonly sessionInstance = new FakeWriteSession();

  session() {
    return this.sessionInstance;
  }
}

class MockPool {
  public queries: { sql: string; params?: any[] }[] = [];
  public selectRows: any[] = [];

  async query(sql: string, params?: any[]) {
    this.queries.push({ sql, params });
    if (sql.trim().toLowerCase().startsWith('select')) {
      return { rows: this.selectRows };
    }
    return { rows: [], rowCount: 0 };
  }
}

describe('graphSnapshotService', () => {
  test('createGraphSnapshot compresses graph data and stores it in postgres', async () => {
    const driver = new FakeReadDriver() as any;
    const pool = new MockPool() as any;

    const snapshot = await createGraphSnapshot({
      label: 'Checkpoint',
      description: 'First milestone',
      tenantId: 'tenant-1',
      driver,
      pool,
      storage: 'postgres',
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.nodeCount).toBe(2);
    expect(snapshot.relationshipCount).toBe(1);
    expect(snapshot.storage).toBe('postgres');

    const insertCall = pool.queries.find((entry: any) =>
      entry.sql.includes('INSERT INTO graph_snapshots'),
    );
    expect(insertCall).toBeDefined();

    const compressed: Buffer = insertCall.params[13];
    expect(Buffer.isBuffer(compressed)).toBe(true);
    const payload = JSON.parse(gunzipSync(compressed).toString('utf-8'));
    expect(payload.nodes).toHaveLength(2);
    expect(payload.relationships).toHaveLength(1);
    expect(payload.nodes[0].properties.age).toBe(30);
  });

  test('restoreGraphSnapshot rebuilds the graph from stored snapshot metadata', async () => {
    const readDriver = new FakeReadDriver() as any;
    const seedPool = new MockPool() as any;

    const created = await createGraphSnapshot({
      label: 'Restore point',
      tenantId: 'tenant-1',
      driver: readDriver,
      pool: seedPool,
      storage: 'postgres',
    });

    const insertCall = seedPool.queries.find((entry: any) =>
      entry.sql.includes('INSERT INTO graph_snapshots'),
    );
    const compressed: Buffer = insertCall.params[13];

    const restorePool = new MockPool() as any;
    restorePool.selectRows = [
      {
        id: created.id,
        label: created.label,
        description: created.description,
        tenant_id: created.tenantId,
        storage: created.storage,
        compression: created.compression,
        size_bytes: created.sizeBytes,
        checksum: created.checksum,
        node_count: created.nodeCount,
        relationship_count: created.relationshipCount,
        created_at: created.createdAt.toISOString(),
        last_restored_at: null,
        format_version: created.formatVersion,
        location: created.location,
        payload: compressed,
      },
    ];

    const writeDriver = new FakeWriteDriver() as any;

    const result = await restoreGraphSnapshot({
      snapshotId: created.id,
      tenantId: 'tenant-1',
      driver: writeDriver,
      pool: restorePool,
    });

    expect(result.restoredNodeCount).toBe(2);
    expect(result.restoredRelationshipCount).toBe(1);

    const deleteCall = writeDriver.sessionInstance.calls.find((call: any) =>
      call.query.includes('DETACH DELETE'),
    );
    expect(deleteCall?.params?.tenantId).toBe('tenant-1');

    const nodeCreateCall = writeDriver.sessionInstance.calls.find((call: any) =>
      call.query.includes('CREATE (n:Person'),
    );
    expect(nodeCreateCall).toBeDefined();

    const relCreateCall = writeDriver.sessionInstance.calls.find((call: any) =>
      call.query.includes('CREATE (start)-[r:KNOWS]->(end)'),
    );
    expect(relCreateCall?.params?.rels[0].start).toBe(100);
    expect(relCreateCall?.params?.rels[0].end).toBe(101);

    const updateCall = restorePool.queries.find((entry: any) =>
      entry.sql.includes('UPDATE graph_snapshots SET last_restored_at'),
    );
    expect(updateCall).toBeDefined();
    expect(writeDriver.sessionInstance.closed).toBe(true);
  });
});

