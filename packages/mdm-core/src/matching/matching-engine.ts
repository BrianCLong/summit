/**
 * Entity Matching Engine
 * Advanced entity matching and deduplication algorithms for MDM
 */

import type {
  MatchingConfig,
  MatchResult,
  MatchingFieldConfig,
  MatchLevel,
  BlockingStrategy
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class MatchingEngine {
  /**
   * Match two records and return match score
   */
  async matchRecords(
    record1: Record<string, unknown>,
    record2: Record<string, unknown>,
    config: MatchingConfig
  ): Promise<MatchResult> {
    // Apply blocking if enabled
    if (config.blockingEnabled && config.blockingStrategy) {
      if (!this.passesBlockingStrategy(record1, record2, config.blockingStrategy)) {
        return this.createNoMatchResult(record1, record2);
      }
    }

    // Calculate field-level scores
    const fieldScores: Record<string, number> = {};
    let totalWeight = 0;
    let weightedScore = 0;

    for (const rule of config.matchingRules) {
      if (!rule.active) continue;

      for (const field of rule.fields) {
        const score = this.compareFields(
          record1[field.fieldName],
          record2[field.fieldName],
          field
        );

        fieldScores[field.fieldName] = score;
        weightedScore += score * field.weight;
        totalWeight += field.weight;
      }
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const matchLevel = this.determineMatchLevel(finalScore, config.threshold);
    const autoApproved = finalScore >= (config.autoApproveThreshold || 0.95);

    return {
      recordId1: String(record1.id || ''),
      recordId2: String(record2.id || ''),
      matchScore: finalScore,
      matchLevel,
      fieldScores,
      confidence: finalScore,
      algorithm: config.algorithm,
      timestamp: new Date(),
      autoApproved,
      reviewRequired: matchLevel === 'medium' || matchLevel === 'low'
    };
  }

  /**
   * Batch matching across record set
   */
  async findMatches(
    records: Record<string, unknown>[],
    config: MatchingConfig
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];

    // Create blocks if blocking is enabled
    const blocks = config.blockingEnabled && config.blockingStrategy
      ? this.createBlocks(records, config.blockingStrategy)
      : [records];

    for (const block of blocks) {
      // Compare all pairs within block
      for (let i = 0; i < block.length; i++) {
        for (let j = i + 1; j < block.length; j++) {
          const result = await this.matchRecords(block[i], block[j], config);
          if (result.matchLevel !== 'no_match') {
            matches.push(result);
          }
        }
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Compare individual fields using appropriate comparator
   */
  private compareFields(
    value1: unknown,
    value2: unknown,
    config: MatchingFieldConfig
  ): number {
    if (value1 === null || value1 === undefined || value2 === null || value2 === undefined) {
      return 0;
    }

    const str1 = String(value1);
    const str2 = String(value2);

    switch (config.comparator) {
      case 'exact':
        return str1 === str2 ? 1.0 : 0.0;

      case 'levenshtein':
        return this.levenshteinSimilarity(str1, str2);

      case 'jaro_winkler':
        return this.jaroWinklerSimilarity(str1, str2);

      case 'soundex':
        return this.soundex(str1) === this.soundex(str2) ? 1.0 : 0.0;

      case 'token_sort':
        return this.tokenSortSimilarity(str1, str2);

      case 'token_set':
        return this.tokenSetSimilarity(str1, str2);

      case 'cosine_similarity':
        return this.cosineSimilarity(str1, str2);

      case 'jaccard':
        return this.jaccardSimilarity(str1, str2);

      default:
        return str1.toLowerCase() === str2.toLowerCase() ? 1.0 : 0.0;
    }
  }

  /**
   * Levenshtein distance-based similarity
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1.0 : 1.0 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Jaro-Winkler similarity
   */
  private jaroWinklerSimilarity(str1: string, str2: string): number {
    const jaroSim = this.jaroSimilarity(str1, str2);

    // Calculate common prefix length (up to 4 characters)
    let prefixLength = 0;
    const minLength = Math.min(4, Math.min(str1.length, str2.length));

    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        prefixLength++;
      } else {
        break;
      }
    }

    // Jaro-Winkler = Jaro + (prefix_length * p * (1 - Jaro))
    // where p is typically 0.1
    const p = 0.1;
    return jaroSim + (prefixLength * p * (1 - jaroSim));
  }

  /**
   * Jaro similarity
   */
  private jaroSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const str1Matches = new Array(str1.length).fill(false);
    const str2Matches = new Array(str2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, str2.length);

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Find transpositions
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    return (
      (matches / str1.length +
        matches / str2.length +
        (matches - transpositions / 2) / matches) /
      3
    );
  }

  /**
   * Soundex phonetic encoding
   */
  private soundex(str: string): string {
    const cleaned = str.toUpperCase().replace(/[^A-Z]/g, '');
    if (cleaned.length === 0) return '0000';

    const codes: Record<string, string> = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6'
    };

    let soundex = cleaned[0];
    let lastCode = codes[cleaned[0]] || '0';

    for (let i = 1; i < cleaned.length && soundex.length < 4; i++) {
      const code = codes[cleaned[i]] || '0';
      if (code !== '0' && code !== lastCode) {
        soundex += code;
        lastCode = code;
      } else if (code !== lastCode) {
        lastCode = code;
      }
    }

    return soundex.padEnd(4, '0');
  }

  /**
   * Token sort similarity
   */
  private tokenSortSimilarity(str1: string, str2: string): number {
    const tokens1 = str1.toLowerCase().split(/\s+/).sort().join(' ');
    const tokens2 = str2.toLowerCase().split(/\s+/).sort().join(' ');
    return this.levenshteinSimilarity(tokens1, tokens2);
  }

  /**
   * Token set similarity
   */
  private tokenSetSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    return this.jaccardSimilarity(
      Array.from(set1).join(' '),
      Array.from(set2).join(' ')
    );
  }

  /**
   * Cosine similarity
   */
  private cosineSimilarity(str1: string, str2: string): number {
    const vec1 = this.getCharacterVector(str1.toLowerCase());
    const vec2 = this.getCharacterVector(str2.toLowerCase());

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    const allChars = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);

    allChars.forEach(char => {
      const v1 = vec1[char] || 0;
      const v2 = vec2[char] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Get character frequency vector
   */
  private getCharacterVector(str: string): Record<string, number> {
    const vec: Record<string, number> = {};
    for (const char of str) {
      vec[char] = (vec[char] || 0) + 1;
    }
    return vec;
  }

  /**
   * Jaccard similarity
   */
  private jaccardSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Check if records pass blocking strategy
   */
  private passesBlockingStrategy(
    record1: Record<string, unknown>,
    record2: Record<string, unknown>,
    strategy: BlockingStrategy
  ): boolean {
    for (const blockingKey of strategy.blockingKeys) {
      let match = true;
      for (const field of blockingKey.fields) {
        if (record1[field] !== record2[field]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  /**
   * Create blocks for efficient matching
   */
  private createBlocks(
    records: Record<string, unknown>[],
    strategy: BlockingStrategy
  ): Record<string, unknown>[][] {
    const blocks = new Map<string, Record<string, unknown>[]>();

    for (const record of records) {
      for (const blockingKey of strategy.blockingKeys) {
        const keyValue = blockingKey.fields
          .map(field => String(record[field] || ''))
          .join('|');

        if (!blocks.has(keyValue)) {
          blocks.set(keyValue, []);
        }
        blocks.get(keyValue)!.push(record);
      }
    }

    // Filter blocks by size
    return Array.from(blocks.values()).filter(
      block => block.length >= strategy.minBlockSize && block.length <= strategy.maxBlockSize
    );
  }

  /**
   * Determine match level from score
   */
  private determineMatchLevel(score: number, threshold: number): MatchLevel {
    if (score >= 0.95) return 'exact';
    if (score >= threshold) return 'high';
    if (score >= threshold * 0.7) return 'medium';
    if (score >= threshold * 0.4) return 'low';
    return 'no_match';
  }

  /**
   * Create no-match result
   */
  private createNoMatchResult(
    record1: Record<string, unknown>,
    record2: Record<string, unknown>
  ): MatchResult {
    return {
      recordId1: String(record1.id || ''),
      recordId2: String(record2.id || ''),
      matchScore: 0,
      matchLevel: 'no_match',
      fieldScores: {},
      confidence: 0,
      algorithm: 'blocking',
      timestamp: new Date(),
      autoApproved: false,
      reviewRequired: false
    };
  }
}
