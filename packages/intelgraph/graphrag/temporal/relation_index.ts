import { TemporalEdge } from './types.js';

export interface ScoredEdge extends TemporalEdge {
  score: number;
}

export class RelationIndex {
  private edges: TemporalEdge[] = [];

  constructor(initialEdges: TemporalEdge[] = []) {
    this.edges = initialEdges;
  }

  /**
   * Search over relation embeddings.
   * In a real system, queryEmbedding would be compared against edge.embedding
   * stored in a vector DB.
   */
  async search(queryEmbedding: number[], topK: number): Promise<ScoredEdge[]> {
    return this.edges
      .map(edge => ({
        ...edge,
        score: this.calculateSimilarity(queryEmbedding, edge)
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.v1.localeCompare(b.v1) || a.rel.localeCompare(b.rel) || a.timestamp.localeCompare(b.timestamp);
      })
      .slice(0, topK);
  }

  private calculateSimilarity(queryVec: number[], edge: TemporalEdge): number {
    // In production, we'd fetch the embedding for edge.rel or edge.embeddingId
    // and compute cosine similarity.
    // For now, we simulate a stable similarity score for determinism.
    let dotProduct = 0;
    for (let i = 0; i < Math.min(queryVec.length, 10); i++) {
        dotProduct += queryVec[i] * (edge.rel.charCodeAt(i % edge.rel.length) / 255);
    }
    return Math.min(1, Math.max(0, 0.5 + dotProduct));
  }

  addEdges(edges: TemporalEdge[]) {
    this.edges.push(...edges);
  }
}
