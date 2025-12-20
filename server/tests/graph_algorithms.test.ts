
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { calculateDegreeCentrality, findShortestPath } from '../src/graph/algorithms.js';
import { runCypher } from '../src/graph/neo4j.js';

jest.mock('../src/graph/neo4j.js', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn()
}));

describe('Graph Algorithms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate degree centrality', async () => {
    const mockResult = [
      { id: '1', name: 'Node A', degree: 10 },
      { id: '2', name: 'Node B', degree: 5 }
    ];
    (runCypher as any).mockResolvedValue(mockResult);

    const result = await calculateDegreeCentrality('tenant-1');

    expect(runCypher).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (n)'),
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
    expect(result).toEqual(mockResult);
  });

  it('should find shortest path', async () => {
    const mockPath = [{ nodes: [], relationships: [], length: 2 }];
    (runCypher as any).mockResolvedValue(mockPath);

    const result = await findShortestPath('tenant-1', 'start', 'end');

    expect(runCypher).toHaveBeenCalledWith(
      expect.stringContaining('shortestPath'),
      expect.objectContaining({
        tenantId: 'tenant-1',
        startNodeId: 'start',
        endNodeId: 'end'
      })
    );
    expect(result).toEqual(mockPath);
  });
});
