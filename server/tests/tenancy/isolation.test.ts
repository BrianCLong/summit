import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EntityRepo } from '../../src/repos/EntityRepo';
import { InvestigationRepo } from '../../src/repos/InvestigationRepo';
// Mock dependencies
const mockPgPool = {
  connect: jest.fn(),
  query: jest.fn(),
} as any;

const mockNeo4jSession = {
  executeWrite: jest.fn(),
  close: jest.fn(),
} as any;

const mockNeo4jDriver = {
  session: jest.fn(() => mockNeo4jSession),
} as any;

describe('Multi-Tenant Isolation Test Suite', () => {
  let entityRepo: EntityRepo;
  let investigationRepo: InvestigationRepo;
  const TENANT_A = 'tenant-a';
  const TENANT_B = 'tenant-b';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repo instances
    entityRepo = new EntityRepo(mockPgPool, mockNeo4jDriver);
    investigationRepo = new InvestigationRepo(mockPgPool);

    // Default mock implementation for connect to return a client
    (mockPgPool.connect as any).mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    });
    (mockNeo4jDriver.session as any).mockReturnValue(mockNeo4jSession);
  });

  describe('InvestigationRepo Isolation', () => {
    it('should include tenant_id in update query', async () => {
      // Setup mock query result
      (mockPgPool.query as any).mockResolvedValue({ rows: [] } as any);

      const input = { id: 'inv-123', name: 'New Name', tenantId: TENANT_A };
      await investigationRepo.update(input);

      // Verify query structure
      const calls = (mockPgPool.query as jest.Mock).mock.calls;
      const updateCall = calls.find((call: any[]) => call[0].includes('UPDATE investigations'));

      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('WHERE id = $1 AND tenant_id = $3');
      expect(updateCall![1]).toContain(TENANT_A);
      expect(updateCall![1]).toContain(input.id);
    });

    it('should include tenant_id in delete query', async () => {
      // Mock client for transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      } as any;
      (mockPgPool.connect as any).mockResolvedValue(mockClient);
      (mockClient.query as any).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await investigationRepo.delete('inv-123', TENANT_A);

      // Verify query structure
      const calls = (mockClient.query as jest.Mock).mock.calls;
      const deleteCall = calls.find((call: any[]) => call[0].includes('DELETE FROM investigations'));

      expect(deleteCall).toBeDefined();
      expect(deleteCall![0]).toContain('WHERE id = $1 AND tenant_id = $2');
      expect(deleteCall![1]).toEqual(['inv-123', TENANT_A]);
    });
  });

  describe('EntityRepo Isolation', () => {
    it('should include tenant_id in update query', async () => {
      // Mock client for transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      } as any;
      (mockPgPool.connect as any).mockResolvedValue(mockClient);
      (mockClient.query as any).mockResolvedValue({ rows: [] } as any);

      const input = { id: 'ent-123', props: { foo: 'bar' }, tenantId: TENANT_B };
      await entityRepo.update(input);

      // Verify query structure
      const calls = (mockClient.query as jest.Mock).mock.calls;
      const updateCall = calls.find((call: any[]) => call[0].includes('UPDATE entities'));

      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('WHERE id = $1 AND tenant_id = $3');
      expect(updateCall![1]).toContain(TENANT_B);
      expect(updateCall![1]).toContain(input.id);
    });

    it('should include tenant_id in delete query (PG and Neo4j)', async () => {
       // Mock client for transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      } as any;
      (mockPgPool.connect as any).mockResolvedValue(mockClient);

      // Simulate successful PG delete
      (mockClient.query as any).mockImplementation((query: string) => {
        if (query.includes('DELETE FROM entities')) {
          return Promise.resolve({ rows: [{ tenant_id: TENANT_B }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await entityRepo.delete('ent-123', TENANT_B);

      // Verify PG delete
      const pgCalls = (mockClient.query as jest.Mock).mock.calls;
      const deleteCall = pgCalls.find((call: any[]) => call[0].includes('DELETE FROM entities'));
      expect(deleteCall![0]).toContain('WHERE id = $1 AND tenant_id = $2');
      expect(deleteCall![1]).toEqual(['ent-123', TENANT_B]);

      // Verify Neo4j delete
      expect(mockNeo4jSession.executeWrite).toHaveBeenCalled();

      // We need to inspect the callback passed to executeWrite
      const executeWriteCallback = (mockNeo4jSession.executeWrite as any).mock.calls[0][0] as (tx: any) => Promise<void>;
      const mockTx = { run: jest.fn() };
      await executeWriteCallback(mockTx);

      expect(mockTx.run).toHaveBeenCalled();
      const neo4jCall = (mockTx.run as jest.Mock).mock.calls[0];
      const neo4jQuery = neo4jCall[0];
      const neo4jParams = neo4jCall[1];

      expect(neo4jQuery).toContain('MATCH (e:Entity {id: $id})');
      expect(neo4jParams).toEqual({ id: 'ent-123' });
    });
  });
});
