import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GraphStore } from '../store.js';
import { runCypher } from '../neo4j.js';

// Mock neo4j
jest.mock('../neo4j.js', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn()
}));

describe('GraphStore', () => {
  let store: GraphStore;

  beforeEach(() => {
    store = new GraphStore();
    jest.clearAllMocks();
  });

  it('should upsert a node with correct params', async () => {
    const node = {
      globalId: 'user-123',
      tenantId: 'tenant-a',
      entityType: 'Actor' as const,
      attributes: { name: 'Alice' }
    };

    (runCypher as jest.Mock).mockResolvedValue([]);

    await store.upsertNode(node);

    expect(runCypher).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (n:GraphNode { globalId: $globalId })'),
      expect.objectContaining({
        globalId: 'user-123',
        tenantId: 'tenant-a',
        attributes: { name: 'Alice' }
      })
    );
  });
});
