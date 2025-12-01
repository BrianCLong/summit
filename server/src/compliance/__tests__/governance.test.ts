import { DataLineageSystem } from '../DataLineageSystem';
import { RetentionPolicyEngine } from '../RetentionPolicyEngine';
import { SchemaDriftDetector } from '../SchemaDriftDetector';

// Mock dependencies
jest.mock('../../config/database', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn().mockImplementation((query, params) => {
      // Simple mock for query execution
      if (query.includes('INSERT INTO lineage_nodes')) {
        return { rowCount: 1 };
      }
      if (query.includes('SELECT id FROM lineage_nodes')) {
          // Simulate not found for first call, then found
          return { rows: [] };
      }
      if (query.includes('SELECT * FROM retention_policies')) {
          return { rows: [{ id: '1', target_type: 'provenance_ledger_v2', retention_days: 30, action: 'DELETE', is_active: true }] };
      }
      if (query.includes('DELETE FROM provenance_ledger_v2')) {
          return { rowCount: 10 };
      }
      if (query.includes('SELECT * FROM schema_snapshots')) {
          return { rows: [{ schema_hash: 'oldhash', schema_definition: { field1: 'string' } }] };
      }
      return { rows: [], rowCount: 0 };
    }),
    connect: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  })),
}));

describe('Governance Authority', () => {

  describe('DataLineageSystem', () => {
    it('should upsert a node', async () => {
      const system = DataLineageSystem.getInstance();
      const id = await system.upsertNode('test_node', 'DATASET');
      expect(id).toBeDefined();
    });
  });

  describe('RetentionPolicyEngine', () => {
    it('should enforce policies', async () => {
      const engine = RetentionPolicyEngine.getInstance();
      // We are mocking the pool, so we just expect it not to crash and call the delete query
      await expect(engine.enforcePolicies()).resolves.not.toThrow();
    });
  });

  describe('SchemaDriftDetector', () => {
    it('should detect drift', async () => {
      const detector = SchemaDriftDetector.getInstance();
      const drift = await detector.checkDrift('test_node', { field1: 'string', field2: 'number' });
      // Based on mock returning { field1: 'string' }, field2 should be added
      expect(drift).toBeDefined();
      expect(drift?.added).toContain('field2');
    });
  });
});
