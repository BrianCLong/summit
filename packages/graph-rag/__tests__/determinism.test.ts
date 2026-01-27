import { describe, it, expect } from 'vitest';
import { sortCandidates, assembleContext } from '../src/core.js';
import { Node, RetrievalResult } from '../src/types.js';

describe('GraphRAG Determinism', () => {
  const nodes: Node[] = [
    { id: 'node-a', label: 'Concept', properties: { text: 'Alpha' } },
    { id: 'node-b', label: 'Concept', properties: { text: 'Bravo' } },
    { id: 'node-c', label: 'Concept', properties: { text: 'Charlie' } },
  ];

  const candidates = [
    { id: 'node-a', score: 0.9, source: 'vector' as const, node: nodes[0] },
    { id: 'node-b', score: 0.8, source: 'graph' as const, node: nodes[1] },
    { id: 'node-c', score: 0.9, source: 'vector' as const, node: nodes[2] }, // Same score as A
  ];

  it('should sort candidates deterministically (Score Desc, ID Asc)', () => {
    // Shuffle input
    const shuffled = [candidates[1], candidates[2], candidates[0]];
    const sorted = sortCandidates(shuffled);

    expect(sorted[0].id).toBe('node-a'); // 0.9, 'node-a' < 'node-c'
    expect(sorted[1].id).toBe('node-c'); // 0.9
    expect(sorted[2].id).toBe('node-b'); // 0.8
  });

  it('should generate identical context hash regardless of input order', () => {
    const run1: RetrievalResult = {
      traversal_path: [],
      ranked_candidates: [candidates[0], candidates[1], candidates[2]]
    };

    const run2: RetrievalResult = {
      traversal_path: [],
      ranked_candidates: [candidates[2], candidates[0], candidates[1]] // Shuffled
    };

    const context1 = assembleContext(run1);
    const context2 = assembleContext(run2);

    expect(context1.payload).toBe(context2.payload);
    expect(context1.content_hash).toBe(context2.content_hash);
  });
});
