/**
 * Topic coherence optimization
 */

import type { Topic } from '../types';

export class CoherenceOptimizer {
  /**
   * Calculate topic coherence score
   */
  calculateCoherence(topic: Topic, documents: string[]): number {
    // Simplified coherence calculation
    const keywords = topic.keywords.map((k) => k.word);
    let totalCoherence = 0;

    for (let i = 0; i < keywords.length - 1; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        totalCoherence += this.pairwiseCoherence(
          keywords[i],
          keywords[j],
          documents
        );
      }
    }

    const pairs = (keywords.length * (keywords.length - 1)) / 2;
    return pairs > 0 ? totalCoherence / pairs : 0;
  }

  /**
   * Calculate pairwise coherence
   */
  private pairwiseCoherence(word1: string, word2: string, documents: string[]): number {
    let cooccurrence = 0;
    let word1Count = 0;
    let word2Count = 0;

    for (const doc of documents) {
      const hasWord1 = doc.includes(word1);
      const hasWord2 = doc.includes(word2);

      if (hasWord1 && hasWord2) cooccurrence++;
      if (hasWord1) word1Count++;
      if (hasWord2) word2Count++;
    }

    const denominator = Math.max(word1Count, word2Count);
    return denominator > 0 ? cooccurrence / denominator : 0;
  }
}
