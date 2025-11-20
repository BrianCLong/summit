/**
 * Vector similarity metrics for semantic search
 */

import type { VectorSimilarity, SimilarityMetric } from '../types.js';

export class CosineSimilarity implements VectorSimilarity {
  readonly metric: SimilarityMetric = 'cosine';

  compute(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  computeBatch(query: number[], vectors: number[][]): number[] {
    return vectors.map((vector) => this.compute(query, vector));
  }
}

export class EuclideanSimilarity implements VectorSimilarity {
  readonly metric: SimilarityMetric = 'euclidean';

  compute(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    // Convert distance to similarity (inverse)
    const distance = Math.sqrt(sum);
    return 1 / (1 + distance);
  }

  computeBatch(query: number[], vectors: number[][]): number[] {
    return vectors.map((vector) => this.compute(query, vector));
  }
}

export class DotProductSimilarity implements VectorSimilarity {
  readonly metric: SimilarityMetric = 'dot_product';

  compute(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }

    return dotProduct;
  }

  computeBatch(query: number[], vectors: number[][]): number[] {
    return vectors.map((vector) => this.compute(query, vector));
  }
}

export class ManhattanSimilarity implements VectorSimilarity {
  readonly metric: SimilarityMetric = 'manhattan';

  compute(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }

    // Convert distance to similarity (inverse)
    return 1 / (1 + sum);
  }

  computeBatch(query: number[], vectors: number[][]): number[] {
    return vectors.map((vector) => this.compute(query, vector));
  }
}

export function getSimilarityFunction(metric: SimilarityMetric): VectorSimilarity {
  switch (metric) {
    case 'cosine':
      return new CosineSimilarity();
    case 'euclidean':
      return new EuclideanSimilarity();
    case 'dot_product':
      return new DotProductSimilarity();
    case 'manhattan':
      return new ManhattanSimilarity();
    default:
      throw new Error(`Unknown similarity metric: ${metric}`);
  }
}

/**
 * Normalize a vector to unit length (L2 norm)
 */
export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return norm === 0 ? vector : vector.map((val) => val / norm);
}

/**
 * Compute approximate nearest neighbors using brute force
 * This is a fallback when specialized ANN libraries are not available
 */
export function bruteForceANN(
  query: number[],
  vectors: Array<{ id: string; vector: number[]; metadata?: any }>,
  topK: number = 10,
  metric: SimilarityMetric = 'cosine',
): Array<{ id: string; score: number; metadata?: any }> {
  const similarity = getSimilarityFunction(metric);

  const scores = vectors.map((item) => ({
    id: item.id,
    score: similarity.compute(query, item.vector),
    metadata: item.metadata,
  }));

  // Sort by score descending and take top K
  return scores.sort((a, b) => b.score - a.score).slice(0, topK);
}
