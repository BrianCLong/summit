/**
 * Semantic search
 */

import type { SemanticSearchResult } from '../types';
import { EmbeddingGenerator } from '../embeddings';

export class SemanticSearch {
  private embedder: EmbeddingGenerator;
  private index: Map<string, number[]> = new Map();

  constructor() {
    this.embedder = new EmbeddingGenerator();
  }

  /**
   * Index documents for semantic search
   */
  async indexDocuments(documents: Array<{ id: string; text: string }>): Promise<void> {
    for (const doc of documents) {
      const embedding = await this.embedder.encode(doc.text);
      this.index.set(doc.id, embedding.vector);
    }
  }

  /**
   * Search documents semantically
   */
  async search(
    query: string,
    documents: Array<{ id: string; text: string }>,
    topK: number = 5
  ): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await this.embedder.encode(query);

    const results = documents.map((doc) => {
      const docVector = this.index.get(doc.id);
      const score = docVector
        ? this.calculateSimilarity(queryEmbedding.vector, docVector)
        : 0;

      return {
        documentId: doc.id,
        score,
        text: doc.text,
      };
    });

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Calculate similarity between vectors
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
  }
}
