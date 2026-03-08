
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { IngestService } from '../IngestService.js';

describe('IngestService Performance Benchmark', () => {
  let ingestService: IngestService;
  let mockClient: any;
  let mockPg: any;
  let mockNeo4j: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPg = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };
    mockNeo4j = {
      session: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      }),
    };
    ingestService = new IngestService(mockPg, mockNeo4j);
  });

  it('should measure ingestion performance for 5000 entities', async () => {
    const entityCount = 5000;
    const entities = Array.from({ length: entityCount }, (_, i) => ({
      externalId: `ext-${i}`,
      kind: 'person',
      labels: ['Person'],
      properties: { name: `Person ${i}`, dateOfBirth: '1990-01-01' },
    }));

    const input = {
      tenantId: 'bench-tenant',
      sourceType: 'benchmark',
      sourceId: 'bench-1',
      userId: 'bench-user',
      entities,
      relationships: [],
    };

    // Setup mock responses
    mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'prov-1' }] }); // Provenance

    // 5 batches of 1000
    for (let i = 0; i < 5; i++) {
        mockClient.query.mockResolvedValueOnce({
            rows: Array(1000).fill({ inserted: true })
        });
    }

    mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

    // Neo4j sync SELECTs (entities)
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // Neo4j sync SELECTs (relationships)
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    const start = Date.now();
    const result = await ingestService.ingest(input);
    const end = Date.now();

    const duration = end - start;
    const throughput = (entityCount / duration) * 1000;

    process.stderr.write(`\n[BENCHMARK] Ingested ${entityCount} entities in ${duration}ms\n`);
    process.stderr.write(`[BENCHMARK] Throughput: ${throughput.toFixed(2)} entities/sec\n`);

    expect(result.success).toBe(true);
    expect(result.entitiesCreated).toBe(entityCount);

    // With batched upserts, we expect only ~10 queries
    expect(mockClient.query.mock.calls.length).toBeLessThan(15);
  });
});
