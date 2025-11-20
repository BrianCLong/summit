/**
 * Text embeddings generation
 */

import type { Embedding } from '../types';

export class EmbeddingGenerator {
  private modelName: string;
  private dimension: number;

  constructor(modelName: string = 'bert-base-uncased', dimension: number = 768) {
    this.modelName = modelName;
    this.dimension = dimension;
  }

  /**
   * Generate embeddings for text
   */
  async encode(text: string): Promise<Embedding> {
    // Simplified embedding generation
    // In production, use actual transformer models
    const vector = Array(this.dimension).fill(0).map(() => Math.random());

    return {
      vector,
      dimension: this.dimension,
      model: this.modelName,
    };
  }

  /**
   * Generate embeddings for multiple texts
   */
  async encodeBatch(texts: string[]): Promise<Embedding[]> {
    return Promise.all(texts.map((text) => this.encode(text)));
  }

  /**
   * Generate sentence embeddings
   */
  async encodeSentence(sentence: string): Promise<Embedding> {
    return this.encode(sentence);
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  cosineSimilarity(emb1: Embedding, emb2: Embedding): number {
    const dotProduct = emb1.vector.reduce((sum, val, idx) => sum + val * emb2.vector[idx], 0);
    const mag1 = Math.sqrt(emb1.vector.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(emb2.vector.reduce((sum, val) => sum + val * val, 0));

    return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
  }
}
