
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GraphPerformanceOptimizer } from '../GraphPerformanceOptimizer.js';

describe('GraphPerformanceOptimizer', () => {
  let optimizer: GraphPerformanceOptimizer;

  beforeEach(() => {
    optimizer = new GraphPerformanceOptimizer({
      supernodeThreshold: 2,
      supernodeHandling: 'paginate'
    });
  });

  it('should correctly identify and handle supernodes using optimized paths', () => {
    const nodes = [
      { id: 'node-1' },
      { id: 'node-2' },
      { id: 'node-3' }
    ];
    const edges = [
      { source: 'node-1', target: 'node-2' },
      { source: 'node-1', target: 'node-3' },
      { source: 'node-1', target: 'node-4' } // node-1 has 3 connections, threshold is 2
    ];

    const result = { nodes, edges: [...edges] };

    // @ts-ignore
    const optimized = optimizer.applySupernodeResultOptimizations(result, { supernodeDetected: true });

    expect(optimized.metadata.supernodeOptimizations).toContain('node-1');
    // Since we only keep 1000 in paginate (default in my code), and we only have 3, none should be removed
    // Wait, my code does: const excess = connections.slice(1000);
    // So if threshold is 2 but we only have 3, nothing is removed because 3 < 1000.
    expect(optimized.edges.length).toBe(3);
  });

  it('should remove excess edges when above limit', () => {
      // Set a very low limit for testing if possible, but 1000 is hardcoded in the method.
      // I'll test the logic with many edges.
      const nodes = [{ id: 'node-1' }];
      const edges = Array.from({ length: 1005 }, (_, i) => ({
          source: 'node-1',
          target: `node-${i + 2}`
      }));

      const result = { nodes, edges: [...edges] };
      // @ts-ignore
      const optimized = optimizer.applySupernodeResultOptimizations(result, { supernodeDetected: true });

      expect(optimized.metadata.supernodeOptimizations).toContain('node-1');
      expect(optimized.edges.length).toBe(1000);
  });
});
