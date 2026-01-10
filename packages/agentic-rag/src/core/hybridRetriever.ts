import { withSpan } from '../observability/instrumentation.js';
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

  async retrieve(
    queryEmbedding: number[],
    options: {
      topK: number;
      workspaceId?: string;
      corpusVersion?: string;
      filters?: Metadata;
    }
  ): Promise<RetrievedChunk[]> {
    const vectorResults = await withSpan('retrieve_vector', () =>
      this.vectorStore.similaritySearch(queryEmbedding, {
        topK: options.topK,
        workspaceId: options.workspaceId,
        corpusVersion: options.corpusVersion,
      })
    );
    let graphResults: RetrievedChunk[] = [];
    if (this.graphStore) {
      try {
        graphResults = await withSpan('retrieve_graph', () =>
          this.graphStore!.expandRelated(options.filters ?? {}, options.topK, options.workspaceId)
        );
      } catch (error) {
        // Governed Exception: degrade gracefully when Neo4j is unavailable.
        graphResults = [];
      }
    }

    return withSpan('merge', async () => {
      const combined = [...vectorResults, ...graphResults];
      const graphIds = new Set(graphResults.map((chunk) => chunk.id));
      const normalized = combined.map((chunk) => ({
        ...chunk,
        score: chunk.score * (graphIds.has(chunk.id) ? this.weights.graph : this.weights.vector),
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
    });
  }
}
