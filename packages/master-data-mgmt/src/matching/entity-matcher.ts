/**
 * Entity Matcher
 * Implements entity matching algorithms with fuzzy logic, phonetic matching,
 * and configurable blocking strategies for performance optimization.
 */

import { trace } from '@opentelemetry/api';
import type {
  SourceRecord,
  MatchRule,
  MatchResult,
  MatchField,
  MatchAlgorithm,
  FieldMatchScore,
  MatchType,
  BlockingKey,
} from '../types.js';

const tracer = trace.getTracer('master-data-mgmt');

/**
 * Configuration for entity matching
 */
export interface EntityMatcherConfig {
  maxCandidates?: number;
  useBlocking?: boolean;
  parallelProcessing?: boolean;
  batchSize?: number;
  reviewThreshold?: number; // Match scores below this require review
}

/**
 * Entity Matcher
 * Matches records using configurable rules and algorithms
 */
export class EntityMatcher {
  private config: Required<EntityMatcherConfig>;

  constructor(config: EntityMatcherConfig = {}) {
    this.config = {
      maxCandidates: config.maxCandidates ?? 100,
      useBlocking: config.useBlocking ?? true,
      parallelProcessing: config.parallelProcessing ?? false,
      batchSize: config.batchSize ?? 50,
      reviewThreshold: config.reviewThreshold ?? 0.7,
    };
  }

  /**
   * Find matching records for a given source record
   */
  async findMatches<T = Record<string, unknown>>(
    record: SourceRecord<T>,
    candidates: SourceRecord<T>[],
    rules: MatchRule[]
  ): Promise<MatchResult[]> {
    return tracer.startActiveSpan('EntityMatcher.findMatches', async (span) => {
      try {
        span.setAttribute('record.id', record.recordId);
        span.setAttribute('candidates.count', candidates.length);
        span.setAttribute('rules.count', rules.length);

        // Filter rules by domain and enabled status
        const applicableRules = rules
          .filter((r) => r.domain === record.domain && r.enabled)
          .sort((a, b) => b.priority - a.priority);

        if (applicableRules.length === 0) {
          return [];
        }

        // Apply blocking if enabled
        let filteredCandidates = candidates;
        if (this.config.useBlocking) {
          filteredCandidates = this.applyBlocking(
            record,
            candidates,
            applicableRules
          );
          span.setAttribute('filtered.candidates.count', filteredCandidates.length);
        }

        // Limit candidates for performance
        const limitedCandidates = filteredCandidates.slice(
          0,
          this.config.maxCandidates
        );

        // Match against each candidate
        const matches: MatchResult[] = [];
        for (const candidate of limitedCandidates) {
          const matchResult = await this.matchRecords(
            record,
            candidate,
            applicableRules
          );
          if (matchResult) {
            matches.push(matchResult);
          }
        }

        // Sort by match score descending
        matches.sort((a, b) => b.matchScore - a.matchScore);

        span.setAttribute('matches.count', matches.length);
        return matches;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Match two records using configured rules
   */
  async matchRecords<T = Record<string, unknown>>(
    record1: SourceRecord<T>,
    record2: SourceRecord<T>,
    rules: MatchRule[]
  ): Promise<MatchResult | null> {
    return tracer.startActiveSpan('EntityMatcher.matchRecords', async (span) => {
      try {
        let totalScore = 0;
        let totalWeight = 0;
        const fieldScores: FieldMatchScore[] = [];
        const rulesMatched: string[] = [];

        for (const rule of rules) {
          const ruleScore = await this.applyMatchRule(
            record1.data,
            record2.data,
            rule
          );

          // Check if rule threshold is met
          if (ruleScore.score >= rule.threshold) {
            totalScore += ruleScore.score * rule.weight;
            totalWeight += rule.weight;
            rulesMatched.push(rule.ruleId);
            fieldScores.push(...ruleScore.fieldScores);
          }
        }

        // Calculate overall match score
        const matchScore = totalWeight > 0 ? totalScore / totalWeight : 0;

        // Check if match score meets minimum threshold
        const minThreshold = Math.min(...rules.map((r) => r.threshold));
        if (matchScore < minThreshold) {
          return null;
        }

        // Determine match type
        const matchType = this.determineMatchType(matchScore);

        // Determine if review is required
        const reviewRequired = matchScore < this.config.reviewThreshold;

        const result: MatchResult = {
          record1Id: record1.recordId,
          record2Id: record2.recordId,
          matchScore,
          fieldScores,
          matchType,
          confidence: this.calculateConfidence(matchScore, fieldScores),
          rulesMatched,
          createdAt: new Date(),
          reviewRequired,
          metadata: {
            record1Source: record1.sourceSystem.systemName,
            record2Source: record2.sourceSystem.systemName,
          },
        };

        span.setAttribute('match.score', matchScore);
        span.setAttribute('match.type', matchType);

        return result;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Apply a single match rule
   */
  private async applyMatchRule(
    data1: Record<string, unknown>,
    data2: Record<string, unknown>,
    rule: MatchRule
  ): Promise<{ score: number; fieldScores: FieldMatchScore[] }> {
    const fieldScores: FieldMatchScore[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const field of rule.fields) {
      const value1 = data1[field.fieldName];
      const value2 = data2[field.fieldName];

      // Skip if either value is missing
      if (value1 === undefined || value2 === undefined) {
        continue;
      }

      const score = this.calculateFieldScore(
        value1,
        value2,
        field
      );

      fieldScores.push({
        fieldName: field.fieldName,
        score,
        algorithm: field.algorithm,
        value1,
        value2,
      });

      totalScore += score * field.weight;
      totalWeight += field.weight;
    }

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return { score: overallScore, fieldScores };
  }

  /**
   * Calculate match score for a single field
   */
  private calculateFieldScore(
    value1: unknown,
    value2: unknown,
    field: MatchField
  ): number {
    // Convert values to strings for comparison
    let str1 = this.normalizeValue(String(value1), field);
    let str2 = this.normalizeValue(String(value2), field);

    // Apply algorithm
    switch (field.algorithm) {
      case 'exact':
        return this.exactMatch(str1, str2);
      case 'fuzzy':
        return this.fuzzyMatch(str1, str2);
      case 'levenshtein':
        return this.levenshteinMatch(str1, str2);
      case 'jaro_winkler':
        return this.jaroWinklerMatch(str1, str2);
      case 'phonetic':
        return this.phoneticMatch(str1, str2, field.phoneticAlgorithm);
      case 'ngram':
        return this.ngramMatch(str1, str2);
      default:
        return this.fuzzyMatch(str1, str2);
    }
  }

  /**
   * Normalize value for comparison
   */
  private normalizeValue(value: string, field: MatchField): string {
    let normalized = value;

    if (!field.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    if (field.normalizeWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    if (field.removeSpecialChars) {
      normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    return normalized;
  }

  /**
   * Exact match algorithm
   */
  private exactMatch(str1: string, str2: string): number {
    return str1 === str2 ? 1.0 : 0.0;
  }

  /**
   * Fuzzy match using simple ratio
   */
  private fuzzyMatch(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Use Levenshtein-based similarity
    return this.levenshteinMatch(str1, str2);
  }

  /**
   * Levenshtein distance-based matching
   */
  private levenshteinMatch(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1.0 : 1.0 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Jaro-Winkler similarity
   */
  private jaroWinklerMatch(str1: string, str2: string): number {
    const jaroSimilarity = this.jaroSimilarity(str1, str2);

    // Calculate common prefix length (up to 4 characters)
    let prefixLength = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) {
        prefixLength++;
      } else {
        break;
      }
    }

    const p = 0.1; // Scaling factor
    return jaroSimilarity + prefixLength * p * (1 - jaroSimilarity);
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

    // Count transpositions
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
      3.0
    );
  }

  /**
   * Phonetic matching
   */
  private phoneticMatch(
    str1: string,
    str2: string,
    algorithm?: 'soundex' | 'metaphone' | 'double_metaphone'
  ): number {
    const alg = algorithm || 'soundex';

    switch (alg) {
      case 'soundex':
        return this.soundex(str1) === this.soundex(str2) ? 1.0 : 0.0;
      case 'metaphone':
        // Simplified metaphone - in production, use a library
        return this.soundex(str1) === this.soundex(str2) ? 1.0 : 0.0;
      case 'double_metaphone':
        // Simplified - in production, use a library
        return this.soundex(str1) === this.soundex(str2) ? 1.0 : 0.0;
      default:
        return 0.0;
    }
  }

  /**
   * Soundex algorithm
   */
  private soundex(str: string): string {
    const a = str.toLowerCase().split('');
    const firstLetter = a[0];

    // Replace consonants with digits
    const codes: Record<string, string> = {
      a: '', e: '', i: '', o: '', u: '', h: '', w: '', y: '',
      b: '1', f: '1', p: '1', v: '1',
      c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
      d: '3', t: '3',
      l: '4',
      m: '5', n: '5',
      r: '6',
    };

    const coded = a
      .map((letter, index) => (index === 0 ? letter : codes[letter] || ''))
      .filter((code, index) => index === 0 || code !== '')
      .filter((code, index, arr) => index === 0 || code !== arr[index - 1]);

    return (firstLetter.toUpperCase() + coded.join('').substr(1) + '0000')
      .substring(0, 4);
  }

  /**
   * N-gram matching
   */
  private ngramMatch(str1: string, str2: string, n: number = 2): number {
    const ngrams1 = this.getNgrams(str1, n);
    const ngrams2 = this.getNgrams(str2, n);

    if (ngrams1.size === 0 && ngrams2.size === 0) return 1.0;
    if (ngrams1.size === 0 || ngrams2.size === 0) return 0.0;

    const intersection = new Set(
      [...ngrams1].filter((x) => ngrams2.has(x))
    );

    const union = ngrams1.size + ngrams2.size - intersection.size;

    return union === 0 ? 0.0 : intersection.size / union;
  }

  /**
   * Get n-grams from string
   */
  private getNgrams(str: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    const padded = ' '.repeat(n - 1) + str + ' '.repeat(n - 1);

    for (let i = 0; i < padded.length - n + 1; i++) {
      ngrams.add(padded.substring(i, i + n));
    }

    return ngrams;
  }

  /**
   * Apply blocking to filter candidates
   */
  private applyBlocking<T = Record<string, unknown>>(
    record: SourceRecord<T>,
    candidates: SourceRecord<T>[],
    rules: MatchRule[]
  ): SourceRecord<T>[] {
    // Collect all blocking keys from rules
    const blockingKeys: BlockingKey[] = [];
    for (const rule of rules) {
      if (rule.blocking) {
        blockingKeys.push(...rule.blocking);
      }
    }

    if (blockingKeys.length === 0) {
      return candidates;
    }

    // Generate blocking key for record
    const recordKeys = this.generateBlockingKeys(record.data, blockingKeys);

    // Filter candidates that share at least one blocking key
    return candidates.filter((candidate) => {
      const candidateKeys = this.generateBlockingKeys(
        candidate.data,
        blockingKeys
      );
      return recordKeys.some((key) => candidateKeys.includes(key));
    });
  }

  /**
   * Generate blocking keys for a record
   */
  private generateBlockingKeys(
    data: Record<string, unknown>,
    blockingKeys: BlockingKey[]
  ): string[] {
    const keys: string[] = [];

    for (const blocking of blockingKeys) {
      const values = blocking.fields
        .map((field) => data[field])
        .filter((v) => v !== undefined && v !== null);

      if (values.length === blocking.fields.length) {
        let key = values.map(String).join('|');

        // Apply transform
        if (blocking.transform) {
          key = this.transformBlockingKey(key, blocking);
        }

        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Transform blocking key
   */
  private transformBlockingKey(key: string, blocking: BlockingKey): string {
    switch (blocking.transform) {
      case 'lowercase':
        return key.toLowerCase();
      case 'uppercase':
        return key.toUpperCase();
      case 'first_n_chars':
        return key.substring(0, blocking.length || 3);
      case 'phonetic':
        return this.soundex(key);
      default:
        return key;
    }
  }

  /**
   * Determine match type based on score
   */
  private determineMatchType(score: number): MatchType {
    if (score >= 0.95) return 'exact';
    if (score >= 0.8) return 'probable';
    if (score >= 0.6) return 'possible';
    return 'no_match';
  }

  /**
   * Calculate confidence in the match
   */
  private calculateConfidence(
    matchScore: number,
    fieldScores: FieldMatchScore[]
  ): number {
    if (fieldScores.length === 0) return 0;

    // Confidence is based on match score and consistency of field scores
    const variance = this.calculateVariance(
      fieldScores.map((f) => f.score)
    );

    // Lower variance = higher confidence
    const consistencyFactor = 1 - Math.min(variance, 1);

    return matchScore * 0.7 + consistencyFactor * 0.3;
  }

  /**
   * Calculate variance of scores
   */
  private calculateVariance(scores: number[]): number {
    if (scores.length === 0) return 0;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map((score) => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Batch match multiple records
   */
  async batchMatch<T = Record<string, unknown>>(
    records: SourceRecord<T>[],
    rules: MatchRule[]
  ): Promise<Map<string, MatchResult[]>> {
    return tracer.startActiveSpan('EntityMatcher.batchMatch', async (span) => {
      try {
        span.setAttribute('records.count', records.length);

        const results = new Map<string, MatchResult[]>();

        // Process in batches
        for (let i = 0; i < records.length; i += this.config.batchSize) {
          const batch = records.slice(i, i + this.config.batchSize);

          for (const record of batch) {
            const matches = await this.findMatches(
              record,
              records.filter((r) => r.recordId !== record.recordId),
              rules
            );
            results.set(record.recordId, matches);
          }
        }

        return results;
      } finally {
        span.end();
      }
    });
  }
}
