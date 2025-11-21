/**
 * Text similarity and matching
 */

import type { SimilarityResult } from '../types';

export class SimilarityEngine {
  /**
   * Cosine similarity
   */
  cosineSimilarity(text1: string, text2: string): number {
    const vec1 = this.vectorize(text1);
    const vec2 = this.vectorize(text2);

    const dotProduct = this.dotProduct(vec1, vec2);
    const magnitude1 = Math.sqrt(this.dotProduct(vec1, vec1));
    const magnitude2 = Math.sqrt(this.dotProduct(vec2, vec2));

    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  /**
   * Jaccard similarity
   */
  jaccardSimilarity(text1: string, text2: string): number {
    const set1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
    const set2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Levenshtein distance
   */
  levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Fuzzy matching
   */
  fuzzyMatch(text: string, pattern: string, threshold: number = 0.8): boolean {
    const distance = this.levenshteinDistance(text.toLowerCase(), pattern.toLowerCase());
    const maxLength = Math.max(text.length, pattern.length);
    const similarity = 1 - distance / maxLength;
    return similarity >= threshold;
  }

  /**
   * Vectorize text (TF-IDF style)
   */
  private vectorize(text: string): Map<string, number> {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const vector = new Map<string, number>();

    for (const word of words) {
      vector.set(word, (vector.get(word) || 0) + 1);
    }

    return vector;
  }

  /**
   * Calculate dot product
   */
  private dotProduct(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let product = 0;

    for (const [word, value1] of vec1) {
      const value2 = vec2.get(word) || 0;
      product += value1 * value2;
    }

    return product;
  }
}

export * from './duplicate-detection';
export * from './semantic';
