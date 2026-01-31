
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { CanonicalGraphService } from '../CanonicalGraphService.js';
import { neo } from '../../db/neo4j.js';

// Mock neo4j session
jest.mock('../../db/neo4j', () => ({
  neo: {
    session: jest.fn().mockReturnValue({
      run: jest.fn(),
      close: jest.fn()
    })
  }
}));

describe('CanonicalGraphService', () => {
  let service: CanonicalGraphService;
  const mockSession = {
    run: jest.fn(),
    close: jest.fn()
  };

  beforeEach(() => {
    (neo.session as jest.Mock).mockReturnValue(mockSession);
    service = CanonicalGraphService.getInstance();
    jest.clearAllMocks();
  });

  it('should project a provenance entry correctly with properties', async () => {
    const entry = {
      id: 'entry-1',
      tenantId: 'tenant-A',
      resourceId: 'doc-123',
      resourceType: 'Document',
      actionType: 'CREATE',
      currentHash: 'hash-123',
      timestamp: new Date(),
      metadata: {},
      payload: { uri: 's3://bucket/doc', version: 'v1' }
    } as any;

    mockSession.run.mockResolvedValue({ records: [] });

    await service.projectEntry(entry);

    expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MERGE (n:CanonicalNode'), expect.objectContaining({
      nodeType: 'Input',
      id: 'doc-123',
      tenantId: 'tenant-A',
      properties: expect.stringContaining('"uri":"s3://bucket/doc"')
    }));
  });

  it('should create relationship with MERGE source (robustness) and tentative flag', async () => {
    const entry = {
      id: 'entry-2',
      tenantId: 'tenant-A',
      resourceId: 'decision-456',
      resourceType: 'Decision',
      actionType: 'EVALUATE',
      currentHash: 'hash-456',
      timestamp: new Date(),
      metadata: {},
      payload: { sourceId: 'doc-123' }
    } as any;

    mockSession.run.mockResolvedValue({ records: [] });

    await service.projectEntry(entry);

    // Verify robust edge creation query
    const calls = mockSession.run.mock.calls;
    const edgeQuery = calls.find(call => call[0].includes('MERGE (source)-[r:DERIVED_FROM'));
    expect(edgeQuery).toBeDefined();
    expect(edgeQuery[0]).toContain("SET r.isTentative = true"); // Defaults to DERIVED_FROM and Tentative
  });

  it('should attempt edge repair', async () => {
      const entry = {
        id: 'entry-1',
        tenantId: 'tenant-A',
        resourceId: 'doc-123',
        resourceType: 'Document',
        actionType: 'CREATE',
        currentHash: 'hash-123',
        timestamp: new Date(),
        metadata: {},
        payload: {}
      } as any;

      // Mock sequence for: 1. Create Node, 2. SourceIds (skip), 3. Outgoing edges check, 4. Upgrade
      mockSession.run.mockResolvedValueOnce({ records: [] }); // create node
      mockSession.run.mockResolvedValueOnce({ // outgoing check
          records: [
              { get: (key: string) => key === 'targetType' ? 'Decision' : 'decision-456' }
          ]
      });
      mockSession.run.mockResolvedValueOnce({ records: [] }); // upgrade

      await service.projectEntry(entry);

      // Verify repair query (FED_INTO)
      expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MERGE (a)-[new:FED_INTO]->(b)'), expect.any(Object));
  });

  it('should calculate graph diff with modifications', async () => {
      // First call (Start Graph)
      mockSession.run.mockResolvedValueOnce({
          records: [{
              get: () => ({
                  segments: [{
                      start: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v1"}' } },
                      end: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v1"}' } },
                      relationship: { type: 'SELF', properties: { timestamp: 0 } }
                  }]
              })
          }]
      });

      // Second call (End Graph)
      mockSession.run.mockResolvedValueOnce({
          records: [{
              get: () => ({
                  segments: [{
                      start: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v2"}' } },
                      end: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v2"}' } },
                      relationship: { type: 'SELF', properties: { timestamp: 0 } }
                  }]
              })
          }]
      });

      const result = await service.getGraphDiff('n1', 'n1', 'tenant-A');

      expect(result.modifications).toHaveLength(1);
      expect(result.modifications[0]).toMatchObject({
          nodeId: 'n1',
          field: 'version',
          oldValue: 'v1',
          newValue: 'v2'
      });
  });

  it('should respect depth cap in explainCausality', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      // Request depth 100
      await service.explainCausality('node-1', 'tenant-A', 100);

      // Verify called with cap (20)
      expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('[*1..20]'), expect.any(Object));
  });

  it('should enforce tenant isolation (Negative Test)', async () => {
      // Simulate attempting to explain causality for a node that belongs to another tenant
      // The service query explicitly includes { tenantId: $tenantId } in the MATCH clause for the end node.
      // So if we request with 'tenant-A' but the node in DB has 'tenant-B', it won't match.

      mockSession.run.mockResolvedValue({ records: [] }); // Return empty because tenant mismatch means no path found to end node

      const result = await service.explainCausality('node-secret', 'tenant-attacker');

      expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('tenantId: $tenantId'),
          expect.objectContaining({ tenantId: 'tenant-attacker' })
      );
      expect(result.nodes).toHaveLength(0);
  });
});
