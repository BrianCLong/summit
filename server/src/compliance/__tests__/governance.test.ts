import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const queryMock = jest.fn().mockImplementation((query: unknown) => {
  const queryText = String(query);
  if (queryText.includes('INSERT INTO lineage_nodes')) {
    return { rowCount: 1 };
  }
  if (queryText.includes('SELECT id FROM lineage_nodes')) {
    return { rows: [] };
  }
  if (queryText.includes('SELECT * FROM retention_policies')) {
    return {
      rows: [
        {
          id: '1',
          target_type: 'provenance_ledger_v2',
          retention_days: 30,
          action: 'DELETE',
          is_active: true,
        },
        {
          id: '2',
          target_type: 'audit_events',
          retention_days: 90,
          action: 'DELETE',
          is_active: true,
        },
      ],
    };
  }
  if (queryText.includes('DELETE FROM provenance_ledger_v2')) {
    return { rowCount: 10 };
  }
  if (queryText.includes('DELETE FROM audit_events')) {
    return { rowCount: 4 };
  }
  if (queryText.includes('SELECT * FROM schema_snapshots')) {
    return {
      rows: [{ schema_hash: 'oldhash', schema_definition: { field1: 'string' } }],
    };
  }
  return { rows: [], rowCount: 0 };
});

const poolMock = {
  query: queryMock,
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
};

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: jest.fn(() => poolMock),
}));

let DataLineageSystem: typeof import('../DataLineageSystem.js').DataLineageSystem;
let RetentionPolicyEngine: typeof import('../RetentionPolicyEngine.js').RetentionPolicyEngine;
let SchemaDriftDetector: typeof import('../SchemaDriftDetector.js').SchemaDriftDetector;

beforeAll(async () => {
  ({ DataLineageSystem } = await import('../DataLineageSystem.js'));
  ({ RetentionPolicyEngine } = await import('../RetentionPolicyEngine.js'));
  ({ SchemaDriftDetector } = await import('../SchemaDriftDetector.js'));
});

beforeEach(() => {
  (DataLineageSystem.getInstance() as any).pool = poolMock;
  (RetentionPolicyEngine.getInstance() as any).pool = poolMock;
  (SchemaDriftDetector.getInstance() as any).pool = poolMock;
  queryMock.mockClear();
});

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
      await expect(engine.enforcePolicies()).resolves.not.toThrow();
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM audit_events'),
        expect.any(Array),
      );
    });
  });

  describe('SchemaDriftDetector', () => {
    it('should detect drift', async () => {
      const detector = SchemaDriftDetector.getInstance();
      const drift = await detector.checkDrift('test_node', {
        field1: 'string',
        field2: 'number',
      });
      expect(drift).toBeDefined();
      expect(drift?.added).toContain('field2');
    });
  });
});
