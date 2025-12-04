import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EntityRepo } from '../../src/repos/EntityRepo';
import { InvestigationRepo } from '../../src/repos/InvestigationRepo';

// Mock dependencies
const mockPgPool = {
  connect: jest.fn(),
  query: jest.fn(),
};

const mockNeo4jSession = {
  executeWrite: jest.fn(),
  close: jest.fn(),
};

const mockNeo4jDriver = {
  session: jest.fn(() => mockNeo4jSession),
};

describe('Multi-Tenant Isolation Test Suite', () => {
  let entityRepo: EntityRepo;
  let investigationRepo: InvestigationRepo;
  const TENANT_A = 'tenant-a';
  const TENANT_B = 'tenant-b';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repo instances
    entityRepo = new EntityRepo(mockPgPool as any, mockNeo4jDriver as any);
    investigationRepo = new InvestigationRepo(mockPgPool as any);

    // Default mock implementation for connect to return a client
    (mockPgPool.connect as jest.Mock).mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    } as never);
  });

  describe('InvestigationRepo Isolation', () => {
    it('should include tenant_id in update query', async () => {
      // Setup mock query result
      (mockPgPool.query as jest.Mock).mockResolvedValue({ rows: [] } as never);

      const input = { id: 'inv-123', name: 'New Name' };
      await investigationRepo.update(input, TENANT_A);

      // Verify query structure
      const calls = (mockPgPool.query as jest.Mock).mock.calls;
      const updateCall = calls.find((call: any) => call[0].includes('UPDATE investigations'));

      expect(updateCall).toBeDefined();
      expect((updateCall as any)[0]).toContain('WHERE id = $1 AND tenant_id = $2');
      expect((updateCall as any)[1]).toContain(TENANT_A);
      expect((updateCall as any)[1]).toContain(input.id);
    });

    it('should include tenant_id in delete query', async () => {
      // Mock client for transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPgPool.connect as jest.Mock).mockResolvedValue(mockClient as never);
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as never);

      await investigationRepo.delete('inv-123', TENANT_A);

      // Verify query structure
      const calls = mockClient.query.mock.calls;
      const deleteCall = calls.find((call: any) => call[0].includes('DELETE FROM investigations'));

      expect(deleteCall).toBeDefined();
      expect((deleteCall as any)[0]).toContain('WHERE id = $1 AND tenant_id = $2');
      expect((deleteCall as any)[1]).toEqual(['inv-123', TENANT_A]);
    });
  });

  describe('EntityRepo Isolation', () => {
    it('should include tenant_id in update query', async () => {
      // Mock client for transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPgPool.connect as jest.Mock).mockResolvedValue(mockClient as never);
      mockClient.query.mockResolvedValue({ rows: [] } as never);

      const input = { id: 'ent-123', props: { foo: 'bar' } };
      await entityRepo.update(input, TENANT_B);

      // Verify query structure
      const calls = mockClient.query.mock.calls;
      const updateCall = calls.find((call: any) => call[0].includes('UPDATE entities'));

      expect(updateCall).toBeDefined();
      expect((updateCall as any)[0]).toContain('WHERE id = $1 AND tenant_id = $2');
      expect((updateCall as any)[1]).toContain(TENANT_B);
      expect((updateCall as any)[1]).toContain(input.id);
    });

    it('should include tenant_id in delete query (PG and Neo4j)', async () => {
       // Mock client for transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPgPool.connect as jest.Mock).mockResolvedValue(mockClient as never);

      // Simulate successful PG delete
      mockClient.query.mockImplementation(((query: string) => {
        if (query.includes('DELETE FROM entities')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      }) as any);

      await entityRepo.delete('ent-123', TENANT_B);

      // Verify PG delete
      const pgCalls = mockClient.query.mock.calls;
      const deleteCall = pgCalls.find((call: any) => call[0].includes('DELETE FROM entities'));
      expect((deleteCall as any)[0]).toContain('WHERE id = $1 AND tenant_id = $2');
      expect((deleteCall as any)[1]).toEqual(['ent-123', TENANT_B]);

      // Verify Neo4j delete
      expect(mockNeo4jSession.executeWrite).toHaveBeenCalled();

      // We need to inspect the callback passed to executeWrite
      const executeWriteCallback = (mockNeo4jSession.executeWrite as jest.Mock).mock.calls[0][0] as any;
      const mockTx = { run: jest.fn() };
      await executeWriteCallback(mockTx);

      expect(mockTx.run).toHaveBeenCalled();
      const neo4jCall = mockTx.run.mock.calls[0] as any;
      const neo4jQuery = neo4jCall[0];
      const neo4jParams = neo4jCall[1];

      expect(neo4jQuery).toContain('MATCH (e:Entity {id: $id, tenantId: $tenantId})');
      expect(neo4jParams).toEqual({ id: 'ent-123', tenantId: TENANT_B });
    });
  });
});
