import { describe, it, expect, jest, beforeEach } from '@jest/globals';

await jest.unstable_mockModule('../neo4j', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn(),
}));

const { GraphStore } = await import('../store');
const { runCypher } = await import('../neo4j');

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

    const mockedRunCypher = runCypher as unknown as jest.Mock;
    // @ts-expect-error lenient test mock setup
    mockedRunCypher.mockResolvedValue([]);

    await store.upsertNode(node);

    expect(runCypher).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (n:GraphNode { globalId: $globalId })'),
      expect.objectContaining({
        globalId: 'user-123',
        tenantId: 'tenant-a',
        attributes: { name: 'Alice' }
      }),
      expect.objectContaining({ tenantId: 'tenant-a', write: true })
    );
  });
});
