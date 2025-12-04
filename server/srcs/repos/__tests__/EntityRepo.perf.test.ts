/**
 * Performance tests for EntityRepo
 */
import { Pool } from 'pg';
import { EntityRepo, EntityInput } from '../EntityRepo';

describe('EntityRepo Performance', () => {
  let repo: EntityRepo;
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    // @ts-ignore
    repo = new EntityRepo(pool, null);
  });

  afterAll(async () => {
    await pool.end();
  });

  // Performance test for the search method
  it('should execute search queries within an acceptable timeframe', async () => {
    const tenantId = 'perf-test-tenant';
    const totalEntities = 1000;
    const entities: EntityInput[] = [];

    // Create a batch of entities for the performance test
    for (let i = 0; i < totalEntities; i++) {
      entities.push({
        tenantId,
        kind: `perf-test-${i % 10}`,
        props: {
          test: 'performance',
          index: i,
        },
      });
    }

    // Insert all entities in a single transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const entity of entities) {
        await client.query(
          'INSERT INTO entities (tenant_id, kind, props) VALUES ($1, $2, $3)',
          [entity.tenantId, entity.kind, entity.props]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Benchmark the search method
    const startTime = Date.now();
    const result = await repo.search({ tenantId, limit: 100 });
    const endTime = Date.now();

    // The search should be fast, even with a large number of entities
    expect(result.length).toBe(100);
    expect(endTime - startTime).toBeLessThan(200); // Should be well under 200ms

    // Clean up the test data
    await pool.query('DELETE FROM entities WHERE tenant_id = $1', [tenantId]);
  }, 30000); // Increase timeout to 30s for this test
});
