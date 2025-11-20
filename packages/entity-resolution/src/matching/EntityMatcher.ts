/**
 * Entity matching with multiple algorithms
 */

import stringSimilarity from 'string-similarity';
import leven from 'leven';
import {
  Entity,
  EntityMatch,
  MatchingMethod,
  MatchingConfig,
  FuzzyMatchOptions
} from '../types.js';

export class EntityMatcher {
  private config: MatchingConfig;

  constructor(config: MatchingConfig) {
    this.config = {
      threshold: 0.8,
      methods: [MatchingMethod.FUZZY, MatchingMethod.EXACT],
      weights: {
        [MatchingMethod.EXACT]: 1.0,
        [MatchingMethod.FUZZY]: 0.8,
        [MatchingMethod.PHONETIC]: 0.7,
        [MatchingMethod.SEMANTIC]: 0.9,
        [MatchingMethod.PROBABILISTIC]: 0.85,
        [MatchingMethod.ML_BASED]: 0.95
      },
      ...config
    };
  }

  /**
   * Find matches for an entity against a list of candidates
   */
  async findMatches(entity: Entity, candidates: Entity[]): Promise<EntityMatch[]> {
    const matches: EntityMatch[] = [];

    for (const candidate of candidates) {
      // Skip if same entity
      if (entity.id === candidate.id) {
        continue;
      }

      // Skip if different types
      if (entity.type !== candidate.type) {
        continue;
      }

      const match = await this.matchPair(entity, candidate);
      if (match && match.score >= this.config.threshold) {
        matches.push(match);
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Match two entities
   */
  async matchPair(entity1: Entity, entity2: Entity): Promise<EntityMatch | null> {
    const scores: Array<{ method: MatchingMethod; score: number; reasons: string[] }> = [];

    // Try each matching method
    for (const method of this.config.methods) {
      let score = 0;
      const reasons: string[] = [];

      switch (method) {
        case MatchingMethod.EXACT:
          ({ score, reasons: reasons } = this.exactMatch(entity1, entity2));
          break;

        case MatchingMethod.FUZZY:
          ({ score, reasons: reasons } = this.fuzzyMatch(entity1, entity2));
          break;

        case MatchingMethod.PHONETIC:
          ({ score, reasons: reasons } = this.phoneticMatch(entity1, entity2));
          break;

        case MatchingMethod.SEMANTIC:
          ({ score, reasons: reasons } = await this.semanticMatch(entity1, entity2));
          break;

        case MatchingMethod.PROBABILISTIC:
          ({ score, reasons: reasons } = this.probabilisticMatch(entity1, entity2));
          break;
      }

      if (score > 0) {
        scores.push({ method, score, reasons });
      }
    }

    if (scores.length === 0) {
      return null;
    }

    // Calculate weighted average score
    const weightedScore = scores.reduce((sum, s) => {
      const weight = this.config.weights?.[s.method] || 1.0;
      return sum + (s.score * weight);
    }, 0) / scores.reduce((sum, s) => sum + (this.config.weights?.[s.method] || 1.0), 0);

    // Determine primary method (highest score)
    const primaryMethod = scores.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Combine all reasons
    const allReasons = scores.flatMap(s => s.reasons);

    return {
      entity1,
      entity2,
      score: weightedScore,
      confidence: this.calculateConfidence(scores),
      method: primaryMethod.method,
      reasons: allReasons
    };
  }

  /**
   * Exact string matching
   */
  private exactMatch(entity1: Entity, entity2: Entity): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let matchCount = 0;
    let totalChecks = 0;

    // Compare normalized text
    const text1 = this.normalizeText(entity1.text);
    const text2 = this.normalizeText(entity2.text);

    totalChecks++;
    if (text1 === text2) {
      matchCount++;
      reasons.push('Exact text match');
    }

    // Compare key attributes
    const commonKeys = Object.keys(entity1.attributes).filter(k =>
      k in entity2.attributes
    );

    for (const key of commonKeys) {
      totalChecks++;
      const val1 = String(entity1.attributes[key]).toLowerCase().trim();
      const val2 = String(entity2.attributes[key]).toLowerCase().trim();

      if (val1 === val2) {
        matchCount++;
        reasons.push(`Exact match on attribute: ${key}`);
      }
    }

    const score = totalChecks > 0 ? matchCount / totalChecks : 0;
    return { score, reasons };
  }

  /**
   * Fuzzy string matching using various algorithms
   */
  private fuzzyMatch(entity1: Entity, entity2: Entity, options?: FuzzyMatchOptions): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const scores: number[] = [];

    const text1 = this.normalizeText(entity1.text);
    const text2 = this.normalizeText(entity2.text);

    // Levenshtein distance
    const maxLen = Math.max(text1.length, text2.length);
    const levenshteinDist = leven(text1, text2);
    const levenshteinScore = 1 - (levenshteinDist / maxLen);
    scores.push(levenshteinScore);

    if (levenshteinScore > 0.8) {
      reasons.push(`High Levenshtein similarity: ${(levenshteinScore * 100).toFixed(1)}%`);
    }

    // Dice coefficient (via string-similarity)
    const diceScore = stringSimilarity.compareTwoStrings(text1, text2);
    scores.push(diceScore);

    if (diceScore > 0.8) {
      reasons.push(`High Dice coefficient: ${(diceScore * 100).toFixed(1)}%`);
    }

    // Token-based matching
    const tokens1 = new Set(text1.split(/\s+/));
    const tokens2 = new Set(text2.split(/\s+/));
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);
    const jaccardScore = intersection.size / union.size;
    scores.push(jaccardScore);

    if (jaccardScore > 0.7) {
      reasons.push(`High token overlap: ${(jaccardScore * 100).toFixed(1)}%`);
    }

    // Fuzzy match on attributes
    const commonKeys = Object.keys(entity1.attributes).filter(k =>
      k in entity2.attributes
    );

    for (const key of commonKeys) {
      const val1 = String(entity1.attributes[key]).toLowerCase().trim();
      const val2 = String(entity2.attributes[key]).toLowerCase().trim();

      const attrScore = stringSimilarity.compareTwoStrings(val1, val2);
      if (attrScore > 0.8) {
        scores.push(attrScore);
        reasons.push(`Fuzzy match on ${key}: ${(attrScore * 100).toFixed(1)}%`);
      }
    }

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { score: avgScore, reasons };
  }

  /**
   * Phonetic matching (Soundex-like)
   */
  private phoneticMatch(entity1: Entity, entity2: Entity): { score: number; reasons: string[] } {
    const reasons: string[] = [];

    const soundex1 = this.soundex(entity1.text);
    const soundex2 = this.soundex(entity2.text);

    const match = soundex1 === soundex2;
    const score = match ? 1.0 : 0.0;

    if (match) {
      reasons.push('Phonetic match (Soundex)');
    }

    return { score, reasons };
  }

  /**
   * Semantic matching using embeddings (placeholder)
   */
  private async semanticMatch(entity1: Entity, entity2: Entity): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = [];

    // In a real implementation, this would use embeddings from a model
    // For now, we'll use a simple contextual similarity
    const context1 = entity1.context || '';
    const context2 = entity2.context || '';

    if (context1 && context2) {
      const contextSimilarity = stringSimilarity.compareTwoStrings(
        context1.toLowerCase(),
        context2.toLowerCase()
      );

      if (contextSimilarity > 0.7) {
        reasons.push(`Similar context: ${(contextSimilarity * 100).toFixed(1)}%`);
        return { score: contextSimilarity, reasons };
      }
    }

    return { score: 0, reasons };
  }

  /**
   * Probabilistic record linkage
   */
  private probabilisticMatch(entity1: Entity, entity2: Entity): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const features: number[] = [];

    // Feature 1: Text similarity
    const textSim = stringSimilarity.compareTwoStrings(
      this.normalizeText(entity1.text),
      this.normalizeText(entity2.text)
    );
    features.push(textSim);

    // Feature 2: Attribute overlap
    const keys1 = Object.keys(entity1.attributes);
    const keys2 = Object.keys(entity2.attributes);
    const commonKeys = keys1.filter(k => keys2.includes(k));
    const attrOverlap = commonKeys.length / Math.max(keys1.length, keys2.length);
    features.push(attrOverlap);

    // Feature 3: Source match
    const sourceSimilarity = entity1.source === entity2.source ? 1.0 : 0.5;
    features.push(sourceSimilarity);

    // Feature 4: Confidence product
    const confProduct = Math.sqrt(entity1.confidence * entity2.confidence);
    features.push(confProduct);

    // Calculate weighted score
    const weights = [0.4, 0.3, 0.15, 0.15];
    const score = features.reduce((sum, feat, idx) => sum + feat * weights[idx], 0);

    if (score > 0.7) {
      reasons.push('High probabilistic linkage score');
      if (textSim > 0.8) reasons.push('Strong text similarity');
      if (attrOverlap > 0.7) reasons.push('High attribute overlap');
      if (confProduct > 0.8) reasons.push('High confidence entities');
    }

    return { score, reasons };
  }

  /**
   * Calculate overall confidence in the match
   */
  private calculateConfidence(scores: Array<{ method: MatchingMethod; score: number }>): number {
    // More methods agreeing = higher confidence
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const methodCount = scores.length;

    // Adjust confidence based on number of agreeing methods
    const methodBonus = Math.min(methodCount / this.config.methods.length, 1.0);

    return avgScore * (0.7 + 0.3 * methodBonus);
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Simple Soundex implementation
   */
  private soundex(text: string): string {
    const normalized = text.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalized.length === 0) return '0000';

    let code = normalized[0];

    const consonantMap: Record<string, string> = {
      'B': '1', 'F': '1', 'P': '1', 'V': '1',
      'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
      'D': '3', 'T': '3',
      'L': '4',
      'M': '5', 'N': '5',
      'R': '6'
    };

    for (let i = 1; i < normalized.length && code.length < 4; i++) {
      const digit = consonantMap[normalized[i]];
      if (digit && digit !== code[code.length - 1]) {
        code += digit;
      }
    }

    return (code + '000').substring(0, 4);
  }
}
