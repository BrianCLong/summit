/**
 * Maximal Marginal Relevance (MMR) for result diversification
 * Balances relevance with diversity
 */

import type { RankedResult, DiversityConfig } from '../types.js';

export class MaximalMarginalRelevance {
  /**
   * Re-rank results using MMR to maximize diversity
   *
   * @param results - Initial ranked results
   * @param lambda - Trade-off parameter (0-1). Higher = more relevance, lower = more diversity
   * @param topK - Number of results to return
   */
  static rerank(
    results: RankedResult[],
    lambda: number = 0.5,
    topK: number = 10,
  ): RankedResult[] {
    if (results.length === 0) return [];
    if (topK >= results.length) return results;

    const selected: RankedResult[] = [];
    const remaining = [...results];

    // Select the first result (highest relevance)
    selected.push(remaining.shift()!);

    // Iteratively select remaining results
    while (selected.length < topK && remaining.length > 0) {
      let maxMMR = -Infinity;
      let maxIdx = 0;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Relevance score (normalized)
        const relevance = candidate.score;

        // Maximum similarity to already selected results
        const maxSimilarity = Math.max(
          ...selected.map((selectedResult) =>
            this.computeSimilarity(candidate, selectedResult),
          ),
        );

        // MMR score: balance relevance and diversity
        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > maxMMR) {
          maxMMR = mmrScore;
          maxIdx = i;
        }
      }

      // Add the best candidate to selected and remove from remaining
      selected.push(remaining.splice(maxIdx, 1)[0]);
    }

    return selected;
  }

  /**
   * Compute similarity between two results
   * This is a simplified version - in practice, you'd use actual embeddings
   */
  private static computeSimilarity(a: RankedResult, b: RankedResult): number {
    // If metadata contains embeddings or feature vectors, use those
    if (a.features && b.features) {
      return this.featureSimilarity(a.features, b.features);
    }

    // Otherwise use a simple heuristic
    // Results that are close in the original ranking are considered similar
    return Math.exp(-Math.abs(a.score - b.score));
  }

  /**
   * Compute cosine similarity between feature vectors
   */
  private static featureSimilarity(
    featuresA: Record<string, number>,
    featuresB: Record<string, number>,
  ): number {
    const keysA = Object.keys(featuresA);
    const keysB = Object.keys(featuresB);
    const allKeys = new Set([...keysA, ...keysB]);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const key of allKeys) {
      const valueA = featuresA[key] || 0;
      const valueB = featuresB[key] || 0;

      dotProduct += valueA * valueB;
      normA += valueA * valueA;
      normB += valueB * valueB;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Coverage-based diversification
 * Ensures results cover different aspects
 */
export class CoverageDiversification {
  static diversify(
    results: RankedResult[],
    diversityField: string,
    topK: number = 10,
  ): RankedResult[] {
    const selected: RankedResult[] = [];
    const coveredValues = new Set<any>();

    // First pass: select results with unique diversity field values
    for (const result of results) {
      if (selected.length >= topK) break;

      const fieldValue = result.metadata?.[diversityField];

      if (fieldValue !== undefined && !coveredValues.has(fieldValue)) {
        selected.push(result);
        coveredValues.add(fieldValue);
      }
    }

    // Second pass: fill remaining slots with highest scored items
    if (selected.length < topK) {
      for (const result of results) {
        if (selected.length >= topK) break;

        if (!selected.includes(result)) {
          selected.push(result);
        }
      }
    }

    return selected;
  }
}
