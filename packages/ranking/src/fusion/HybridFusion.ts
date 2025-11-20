/**
 * Hybrid search result fusion algorithms
 * Combines results from multiple ranking sources
 */

import type { RankedResult, FusionConfig } from '../types.js';

export class HybridFusion {
  /**
   * Reciprocal Rank Fusion (RRF)
   * Combines rankings from multiple sources without needing normalized scores
   */
  static reciprocalRankFusion(
    rankings: RankedResult[][],
    k: number = 60,
  ): RankedResult[] {
    const scoreMap = new Map<string, { totalScore: number; result: RankedResult }>();

    for (const ranking of rankings) {
      for (let i = 0; i < ranking.length; i++) {
        const result = ranking[i];
        const rank = i + 1;
        const rrfScore = 1 / (k + rank);

        if (scoreMap.has(result.id)) {
          const entry = scoreMap.get(result.id)!;
          entry.totalScore += rrfScore;
        } else {
          scoreMap.set(result.id, {
            totalScore: rrfScore,
            result: { ...result },
          });
        }
      }
    }

    // Convert to array and sort by RRF score
    const fusedResults = Array.from(scoreMap.values())
      .map(({ totalScore, result }) => ({
        ...result,
        score: totalScore,
      }))
      .sort((a, b) => b.score - a.score);

    return fusedResults;
  }

  /**
   * Linear combination of scores
   * Requires normalized scores
   */
  static linearCombination(
    rankings: RankedResult[][],
    weights?: number[],
  ): RankedResult[] {
    if (weights && weights.length !== rankings.length) {
      throw new Error('Number of weights must match number of rankings');
    }

    const defaultWeights = weights || Array(rankings.length).fill(1 / rankings.length);
    const scoreMap = new Map<string, { totalScore: number; result: RankedResult }>();

    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i];
      const weight = defaultWeights[i];

      // Normalize scores for this ranking
      const normalizedRanking = this.normalizeScores(ranking);

      for (const result of normalizedRanking) {
        if (scoreMap.has(result.id)) {
          const entry = scoreMap.get(result.id)!;
          entry.totalScore += result.score * weight;
        } else {
          scoreMap.set(result.id, {
            totalScore: result.score * weight,
            result: { ...result },
          });
        }
      }
    }

    const fusedResults = Array.from(scoreMap.values())
      .map(({ totalScore, result }) => ({
        ...result,
        score: totalScore,
      }))
      .sort((a, b) => b.score - a.score);

    return fusedResults;
  }

  /**
   * Multiplicative combination
   * Multiplies normalized scores
   */
  static multiplicativeCombination(rankings: RankedResult[][]): RankedResult[] {
    const scoreMap = new Map<string, { totalScore: number; result: RankedResult; count: number }>();

    for (const ranking of rankings) {
      const normalizedRanking = this.normalizeScores(ranking);

      for (const result of normalizedRanking) {
        if (scoreMap.has(result.id)) {
          const entry = scoreMap.get(result.id)!;
          entry.totalScore *= result.score;
          entry.count += 1;
        } else {
          scoreMap.set(result.id, {
            totalScore: result.score,
            result: { ...result },
            count: 1,
          });
        }
      }
    }

    const fusedResults = Array.from(scoreMap.values())
      .map(({ totalScore, result, count }) => ({
        ...result,
        // Take geometric mean
        score: Math.pow(totalScore, 1 / count),
      }))
      .sort((a, b) => b.score - a.score);

    return fusedResults;
  }

  /**
   * Borda count fusion
   * Position-based voting method
   */
  static bordaCount(rankings: RankedResult[][]): RankedResult[] {
    const scoreMap = new Map<string, { totalScore: number; result: RankedResult }>();

    for (const ranking of rankings) {
      const maxRank = ranking.length;

      for (let i = 0; i < ranking.length; i++) {
        const result = ranking[i];
        const bordaScore = maxRank - i; // Higher score for better rank

        if (scoreMap.has(result.id)) {
          const entry = scoreMap.get(result.id)!;
          entry.totalScore += bordaScore;
        } else {
          scoreMap.set(result.id, {
            totalScore: bordaScore,
            result: { ...result },
          });
        }
      }
    }

    const fusedResults = Array.from(scoreMap.values())
      .map(({ totalScore, result }) => ({
        ...result,
        score: totalScore,
      }))
      .sort((a, b) => b.score - a.score);

    return fusedResults;
  }

  /**
   * Main fusion method that delegates to specific algorithms
   */
  static fuse(rankings: RankedResult[][], config: FusionConfig): RankedResult[] {
    switch (config.method) {
      case 'rrf':
        return this.reciprocalRankFusion(rankings, config.rrfK || 60);

      case 'linear':
        return this.linearCombination(
          rankings,
          config.weights ? Object.values(config.weights) : undefined,
        );

      case 'normalized_linear':
        // Normalize before linear combination
        const normalizedRankings = rankings.map((r) => this.normalizeScores(r));
        return this.linearCombination(
          normalizedRankings,
          config.weights ? Object.values(config.weights) : undefined,
        );

      case 'multiplicative':
        return this.multiplicativeCombination(rankings);

      case 'borda':
        return this.bordaCount(rankings);

      default:
        throw new Error(`Unknown fusion method: ${config.method}`);
    }
  }

  /**
   * Normalize scores to 0-1 range
   */
  private static normalizeScores(results: RankedResult[]): RankedResult[] {
    if (results.length === 0) return [];

    const scores = results.map((r) => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore;

    if (range === 0) {
      return results.map((r) => ({ ...r, score: 1 }));
    }

    return results.map((r) => ({
      ...r,
      score: (r.score - minScore) / range,
    }));
  }
}
