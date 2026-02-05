import { HybridRetriever } from '../HybridRetriever.js';
import { MockVectorRetriever } from '../mocks/MockVectorRetriever.js';
import { MockGraphRetriever } from '../mocks/MockGraphRetriever.js';
import { IntentSpec } from '../../intent_compiler.js';

describe('HybridRetriever contract', () => {
  const intent: IntentSpec = {
    query_id: '2f6d5b28-2f61-49ef-8a9e-1c6a7c86a5d2',
    original_query: 'Find related entities for Alpha',
    intent_type: 'neighbor_expansion',
    target_entities: [
      { id: 'entity-alpha', type: 'Person', confidence: 0.9 },
    ],
    constraints: {
      max_hops: 2,
      relationship_types: ['KNOWS'],
      min_confidence: 0.5,
    },
    evidence_budget: {
      max_nodes: 25,
      max_edges: 50,
      max_paths: 10,
    },
    ordering: { by: 'centrality', direction: 'DESC' },
  };

  it('merges vector and graph candidates deterministically', async () => {
    const retriever = new HybridRetriever(
      new MockVectorRetriever(),
      new MockGraphRetriever(),
    );

    const result = await retriever.retrieve({
      queryId: 'qry-001',
      queryText: 'Alpha network context',
      k: 3,
      budget: { maxNodes: 50, maxEdges: 100, maxPaths: 20 },
      intent,
      weights: { vector: 0.6, graph: 0.4 },
    });

    expect(result.manifest.strategy).toBe('HYBRID');
    expect(result.candidates.length).toBe(3);

    const ids = result.candidates.map((c) => c.id);
    expect(ids).toEqual(['doc-alpha', 'doc-beta', 'doc-delta']);

    const alpha = result.candidates[0];
    expect(alpha.evidenceIds).toEqual(
      expect.arrayContaining(['EVD-VECTOR-ALPHA', 'EVD-GRAPH-ALPHA']),
    );
    expect(alpha.combinedScore).toBeGreaterThan(0.7);
  });

  it('rejects missing graph intent', async () => {
    const retriever = new HybridRetriever(
      new MockVectorRetriever(),
      new MockGraphRetriever(),
    );

    await expect(
      retriever.retrieve({
        queryId: 'qry-002',
        queryText: 'Alpha context',
        k: 2,
        budget: { maxNodes: 10, maxEdges: 10, maxPaths: 5 },
      }),
    ).rejects.toThrow('Graph intent is required');
  });

  it('enforces evidence budget limits', async () => {
    const retriever = new HybridRetriever(
      new MockVectorRetriever(),
      new MockGraphRetriever(),
    );

    await expect(
      retriever.retrieve({
        queryId: 'qry-003',
        queryText: 'Alpha context',
        k: 2,
        budget: { maxNodes: 5, maxEdges: 5, maxPaths: 2 },
        intent,
      }),
    ).rejects.toThrow('Evidence budget violation');
  });
});
