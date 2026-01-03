import type { GraphStore, HybridRetriever, Metadata, RetrievedChunk, VectorStore } from './types.js';

export interface HybridRetrieverConfig {
  vectorStore: VectorStore;
  graphStore?: GraphStore;
  weights?: { vector: number; graph: number };
}

export class DefaultHybridRetriever implements HybridRetriever {
  private readonly vectorStore: VectorStore;
  private readonly graphStore?: GraphStore;
  private readonly weights: { vector: number; graph: number };

  constructor(config: HybridRetrieverConfig) {
    this.vectorStore = config.vectorStore;
    this.graphStore = config.graphStore;
    this.weights = config.weights ?? { vector: 0.7, graph: 0.3 };
  }

  async retrieve(queryEmbedding: number[], filters: Metadata | undefined, options: { topK: number }): Promise<RetrievedChunk[]> {
    const vectorResults = await this.vectorStore.similaritySearch(queryEmbedding, options.topK, filters?.workspaceId as string);
    let graphResults: RetrievedChunk[] = [];
    if (this.graphStore) {
      try {
        graphResults = await this.graphStore.expandRelated(filters ?? {}, options.topK);
      } catch (error) {
        // degrade gracefully when Neo4j unavailable
        graphResults = [];
      }
    }

    const combined = [...vectorResults, ...graphResults];
    const normalized = combined.map((chunk) => ({
      ...chunk,
      score: chunk.score * (graphResults.includes(chunk) ? this.weights.graph : this.weights.vector),
    }));

    const deduped = new Map<string, RetrievedChunk>();
    for (const chunk of normalized) {
      const key = `${chunk.sourceId ?? chunk.documentId}:${chunk.position}`;
      const existing = deduped.get(key);
      if (!existing || existing.score < chunk.score) {
        deduped.set(key, chunk);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => b.score - a.score).slice(0, options.topK);
  }
}

