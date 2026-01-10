import { DefaultHybridRetriever } from '../core/hybridRetriever.js';
import type { VectorStore, GraphStore, RetrievedChunk } from '../core/types.js';

class InMemoryVectorStore implements VectorStore {
  constructor(private readonly chunks: RetrievedChunk[]) {}
  async upsert() { /* noop */ }
  async similaritySearch(_: number[], _options: { topK: number }) {
    return this.chunks;
  }
}

class InMemoryGraphStore implements GraphStore {
  constructor(private readonly chunks: RetrievedChunk[]) {}
  async upsertEntities() { /* noop */ }
  async expandRelated(_: unknown, __: number, ___?: string) {
    return this.chunks;
  }
}

describe('DefaultHybridRetriever', () => {
  it('merges vector and graph results deterministically', async () => {
    const vectorChunk: RetrievedChunk = {
      id: 'v1',
      documentId: 'doc',
      content: 'vector',
      position: 0,
      startOffset: 0,
      endOffset: 6,
      score: 0.9,
    } as RetrievedChunk;

    const graphChunk: RetrievedChunk = {
      id: 'g1',
      documentId: 'doc',
      content: 'graph',
      position: 0,
      startOffset: 0,
      endOffset: 5,
      score: 0.4,
    } as RetrievedChunk;

    const retriever = new DefaultHybridRetriever({
      vectorStore: new InMemoryVectorStore([vectorChunk]),
      graphStore: new InMemoryGraphStore([graphChunk]),
      weights: { vector: 0.7, graph: 0.3 },
    });

    const results = await retriever.retrieve([0.1], { topK: 5 });
    expect(results[0].id).toBe('v1');
    expect(results.length).toBe(1);
  });
});
