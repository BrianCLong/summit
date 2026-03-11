import { describe, it, expect, vi } from 'vitest';
import { ShortestPathAlgorithms } from '../pathfinding/ShortestPath.js';
import type { GraphStorage, Node, Edge } from '@intelgraph/graph-database';

describe('ShortestPathAlgorithms', () => {
  it('dijkstra finds shortest path', () => {
    // Stub GraphStorage
    const mockStorage = {
      getNode: vi.fn((id: string) => ({ id } as Node)),
      getOutgoingEdges: vi.fn((nodeId: string) => {
        if (nodeId === 'A') {
          return [
            { sourceId: 'A', targetId: 'B', weight: 1 } as Edge,
            { sourceId: 'A', targetId: 'C', weight: 4 } as Edge
          ];
        }
        if (nodeId === 'B') {
          return [
            { sourceId: 'B', targetId: 'C', weight: 2 } as Edge
          ];
        }
        return [];
      }),
    } as unknown as GraphStorage;

    const algorithms = new ShortestPathAlgorithms(mockStorage);
    const path = algorithms.dijkstra('A', 'C');

    expect(path).not.toBeNull();
    expect(path?.nodes.map(n => n.id)).toEqual(['A', 'B', 'C']);
    expect(path?.weight).toBe(3);
    expect(path?.length).toBe(2);
  });
});
