import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockGetInstance = jest.fn();
const mockAppendEntry = jest.fn();

jest.unstable_mockModule('../../services/IntelGraphService', () => ({
  IntelGraphService: {
    getInstance: mockGetInstance,
  },
}));

jest.unstable_mockModule('../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: mockAppendEntry,
  },
}));

const { EntityResolver } = await import('../engine/EntityResolver');
const { IntelGraphService } = await import('../../services/IntelGraphService');
const { provenanceLedger } = await import('../../provenance/ledger');

describe('EntityResolver', () => {
  let resolver: EntityResolver;
  let mockGraphService: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockGraphService = {
      getNodeById: jest.fn(),
      searchNodes: jest.fn(),
      findSimilarNodes: jest.fn(),
      ensureNode: jest.fn(),
      createEdge: jest.fn(),
    };

    (IntelGraphService.getInstance as jest.Mock).mockReturnValue(mockGraphService);

    const stubModel = {
      predict: jest.fn().mockResolvedValue({
        score: 0.95,
        confidence: 'high',
        explanation: 'mocked model',
        suggestedAction: 'auto_merge',
        features: [],
      }),
    };

    resolver = new EntityResolver(stubModel as any);
  });

  describe('findDuplicates', () => {
    it('should find duplicates based on threshold', async () => {
      // Add phone/address to bump score to high > 0.9
      // Name (0.4) + Email (0.2) + Phone (0.2) + Address (0.2)
      const entity = { id: '1', label: 'Person', name: 'John Doe', email: 'john@example.com', phone: '123', address: '123 St' };
      const candidate1 = { id: '2', label: 'Person', name: 'John Doe', email: 'john@example.com', phone: '123', address: '123 St' }; // high match
      const candidate2 = { id: '3', label: 'Person', name: 'Jane Smith', email: 'jane@example.com' }; // no match

      mockGraphService.getNodeById.mockResolvedValue(entity);
      mockGraphService.findSimilarNodes.mockResolvedValue([candidate1]);

      const results = await resolver.findDuplicates('tenant1', '1', 0.8);

      expect(results).toHaveLength(1);
      expect(results[0].matchCandidateId).toBe('2');
      expect(results[0].confidence).toBe('high');
    });
  });

  describe('merge', () => {
    it('should merge entities and create provenance', async () => {
      const entityA = { id: '1', label: 'Person', name: 'John Doe', email: 'john@example.com', updatedAt: '2023-01-01' };
      const entityB = { id: '2', label: 'Person', name: 'Johnny Doe', phone: '123456', updatedAt: '2023-02-01' };

      mockGraphService.getNodeById.mockResolvedValueOnce(entityA).mockResolvedValueOnce(entityB);

      const result = await resolver.merge('tenant1', '1', '2', ['recency']);

      expect(result.status).toBe('completed');
      expect(mockGraphService.ensureNode).toHaveBeenCalled();

      const ensureCall = mockGraphService.ensureNode.mock.calls[0];
      const mergedProps = ensureCall[2];
      expect(mergedProps.name).toBe('Johnny Doe');
      expect(mergedProps.email).toBe('john@example.com');
      expect(mergedProps.phone).toBe('123456');

      expect(mockGraphService.createEdge).toHaveBeenCalledWith('tenant1', '2', '1', 'MERGED_INTO', expect.any(Object));
      expect(provenanceLedger.appendEntry).toHaveBeenCalled();
    });
  });
});
