import { describe, it, expect, vi } from 'vitest';
import { CentralityMeasures } from '../centrality/CentralityMeasures.js';
import type { GraphStorage, Node, Edge } from '@intelgraph/graph-database';

describe('CentralityMeasures', () => {
  it('pageRank computes ranks correctly', () => {
    // Stub GraphStorage
    const mockStorage = {
      exportGraph: vi.fn(() => ({
        nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }] as Node[],
        edges: []
      })),
      getIncomingEdges: vi.fn((nodeId: string) => {
        if (nodeId === 'B') {
          return [{ sourceId: 'A', targetId: 'B' } as Edge];
        }
        if (nodeId === 'C') {
          return [
            { sourceId: 'A', targetId: 'C' } as Edge,
            { sourceId: 'B', targetId: 'C' } as Edge
          ];
        }
        return [];
      }),
      getDegree: vi.fn((nodeId: string, dir: string) => {
        if (dir === 'out') {
          if (nodeId === 'A') return 2;
          if (nodeId === 'B') return 1;
        }
        return 0;
      })
    } as unknown as GraphStorage;

    const measures = new CentralityMeasures(mockStorage);
    const ranks = measures.pageRank(0.85, 100);

    expect(ranks.size).toBe(3);

    // C should have highest rank (in-degree 2), A lowest (in-degree 0)
    expect(ranks.get('C')).toBeGreaterThan(ranks.get('B')!);
    expect(ranks.get('B')).toBeGreaterThan(ranks.get('A')!);
  });
});
