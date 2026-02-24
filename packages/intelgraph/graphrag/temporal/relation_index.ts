import { TemporalEdge } from './types';

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
        if (Math.abs(b.score - a.score) > 1e-6) return b.score - a.score;
        return a.v1.localeCompare(b.v1) || a.rel.localeCompare(b.rel) || a.timestamp.localeCompare(b.timestamp);
      })
      .slice(0, topK);
  }

  private calculateSimilarity(queryVec: number[], edge: TemporalEdge): number {
    // If edge has a real embedding, use it
    if (edge.embedding) {
        return this.cosineSimilarity(queryVec, edge.embedding);
    }

    // Fallback: stable pseudo-embedding for demonstration/tests
    const pseudoEmbedding = this.generatePseudoEmbedding(edge.rel);
    return this.cosineSimilarity(queryVec, pseudoEmbedding);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const mag = Math.sqrt(normA) * Math.sqrt(normB);
    return mag === 0 ? 0 : dotProduct / mag;
  }

  private generatePseudoEmbedding(text: string): number[] {
    const emb = new Array(32).fill(0);
    for (let i = 0; i < text.length; i++) {
        emb[i % 32] += text.charCodeAt(i) / 255;
    }
    return emb;
  }

  addEdges(edges: TemporalEdge[]) {
    this.edges.push(...edges);
  }
}
