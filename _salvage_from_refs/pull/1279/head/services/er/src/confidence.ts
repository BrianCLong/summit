/**
 * Entity Resolution Confidence System
 *
 * Computes confidence scores for entity matching candidates,
 * assigns confidence bands, and determines auto-merge eligibility.
 */

import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'er-confidence' });

// Configuration schemas
export const SimilarityFactorSchema = z.object({
  name: z.string(),
  type: z.enum(['exact_match', 'fuzzy_match', 'semantic', 'structural']),
  weight: z.number().min(0).max(1),
  applicable_entity_types: z.array(z.string()),
  config: z.record(z.any()).default({})
});

export const ConfidenceConfigSchema = z.object({
  high_threshold: z.number().min(0).max(1).default(0.92),
  mid_threshold: z.number().min(0).max(1).default(0.75),
  auto_merge_enabled: z.boolean().default(true),
  auto_merge_threshold: z.number().min(0).max(1).default(0.95),
  algorithm_version: z.string().default('similarity-v1.0')
});

export type SimilarityFactor = z.infer<typeof SimilarityFactorSchema>;
export type ConfidenceConfig = z.infer<typeof ConfidenceConfigSchema>;

// Entity data structures
export interface EntityData {
  id: string;
  type: string;
  attributes: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConfidenceResult {
  score: number;
  band: 'LOW' | 'MID' | 'HIGH';
  factors: Record<string, number>;
  should_auto_merge: boolean;
  details: {
    algorithm_version: string;
    computation_time_ms: number;
    factor_breakdown: Array<{
      factor_name: string;
      factor_type: string;
      raw_score: number;
      weighted_score: number;
      weight: number;
    }>;
  };
}

/**
 * Entity similarity computation engine
 */
export class ConfidenceEngine {
  private factors: Map<string, SimilarityFactor> = new Map();
  private config: ConfidenceConfig;

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = ConfidenceConfigSchema.parse(config);
    this.loadDefaultFactors();

    logger.info('Confidence engine initialized', {
      config: this.config,
      factor_count: this.factors.size
    });
  }

  /**
   * Compute confidence score between two entities
   */
  async computeConfidence(
    primaryEntity: EntityData,
    candidateEntity: EntityData,
    context?: { tenant_id: string; user_id?: string }
  ): Promise<ConfidenceResult> {
    const start_time = Date.now();

    try {
      logger.debug({
        primary_id: primaryEntity.id,
        candidate_id: candidateEntity.id,
        entity_type: primaryEntity.type
      }, 'Computing entity confidence');

      // Get applicable factors for this entity type
      const applicableFactors = Array.from(this.factors.values())
        .filter(factor => factor.applicable_entity_types.includes(primaryEntity.type));

      if (applicableFactors.length === 0) {
        logger.warn({
          entity_type: primaryEntity.type,
          available_types: Array.from(this.factors.values())
            .flatMap(f => f.applicable_entity_types)
        }, 'No applicable factors found for entity type');
      }

      // Compute factor scores
      const factorResults: Array<{
        factor_name: string;
        factor_type: string;
        raw_score: number;
        weighted_score: number;
        weight: number;
      }> = [];

      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const factor of applicableFactors) {
        const rawScore = await this.computeFactorScore(
          factor,
          primaryEntity,
          candidateEntity
        );

        const weightedScore = rawScore * factor.weight;
        totalWeightedScore += weightedScore;
        totalWeight += factor.weight;

        factorResults.push({
          factor_name: factor.name,
          factor_type: factor.type,
          raw_score: rawScore,
          weighted_score: weightedScore,
          weight: factor.weight
        });
      }

      // Calculate final confidence score
      const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

      // Determine confidence band
      const band = this.determineConfidenceBand(finalScore);

      // Check auto-merge eligibility
      const shouldAutoMerge = this.config.auto_merge_enabled &&
                              finalScore >= this.config.auto_merge_threshold;

      // Create factor summary
      const factors: Record<string, number> = {};
      factorResults.forEach(result => {
        factors[result.factor_name] = result.raw_score;
      });

      const computation_time = Date.now() - start_time;

      const result: ConfidenceResult = {
        score: Math.round(finalScore * 10000) / 10000, // Round to 4 decimal places
        band,
        factors,
        should_auto_merge: shouldAutoMerge,
        details: {
          algorithm_version: this.config.algorithm_version,
          computation_time_ms: computation_time,
          factor_breakdown: factorResults
        }
      };

      logger.info({
        primary_id: primaryEntity.id,
        candidate_id: candidateEntity.id,
        confidence_score: result.score,
        confidence_band: result.band,
        should_auto_merge: shouldAutoMerge,
        computation_time_ms: computation_time,
        factor_count: factorResults.length
      }, 'Confidence computation completed');

      return result;

    } catch (error) {
      const computation_time = Date.now() - start_time;

      logger.error({
        error: error.message,
        primary_id: primaryEntity.id,
        candidate_id: candidateEntity.id,
        computation_time_ms: computation_time
      }, 'Confidence computation failed');

      throw new Error(`Confidence computation failed: ${error.message}`);
    }
  }

  /**
   * Batch compute confidence for multiple candidates
   */
  async computeBatchConfidence(
    primaryEntity: EntityData,
    candidates: EntityData[],
    context?: { tenant_id: string; user_id?: string }
  ): Promise<Array<{ candidate: EntityData; confidence: ConfidenceResult }>> {
    const results = [];

    for (const candidate of candidates) {
      try {
        const confidence = await this.computeConfidence(primaryEntity, candidate, context);
        results.push({ candidate, confidence });
      } catch (error) {
        logger.error({
          error: error.message,
          primary_id: primaryEntity.id,
          candidate_id: candidate.id
        }, 'Batch confidence computation failed for candidate');

        // Continue with other candidates
      }
    }

    return results.sort((a, b) => b.confidence.score - a.confidence.score);
  }

  /**
   * Update confidence configuration
   */
  updateConfig(newConfig: Partial<ConfidenceConfig>): void {
    this.config = ConfidenceConfigSchema.parse({ ...this.config, ...newConfig });
    logger.info('Confidence configuration updated', { config: this.config });
  }

  /**
   * Add or update similarity factor
   */
  addSimilarityFactor(factor: SimilarityFactor): void {
    const validated = SimilarityFactorSchema.parse(factor);
    this.factors.set(validated.name, validated);
    logger.info('Similarity factor added/updated', { factor_name: validated.name });
  }

  /**
   * Get current configuration and factors
   */
  getConfiguration(): {
    config: ConfidenceConfig;
    factors: SimilarityFactor[];
  } {
    return {
      config: this.config,
      factors: Array.from(this.factors.values())
    };
  }

  /**
   * Compute individual factor score
   */
  private async computeFactorScore(
    factor: SimilarityFactor,
    primaryEntity: EntityData,
    candidateEntity: EntityData
  ): Promise<number> {
    switch (factor.type) {
      case 'exact_match':
        return this.computeExactMatch(factor, primaryEntity, candidateEntity);

      case 'fuzzy_match':
        return this.computeFuzzyMatch(factor, primaryEntity, candidateEntity);

      case 'semantic':
        return this.computeSemanticSimilarity(factor, primaryEntity, candidateEntity);

      case 'structural':
        return this.computeStructuralSimilarity(factor, primaryEntity, candidateEntity);

      default:
        logger.warn({ factor_type: factor.type }, 'Unknown factor type');
        return 0;
    }
  }

  /**
   * Exact match scoring
   */
  private computeExactMatch(
    factor: SimilarityFactor,
    primaryEntity: EntityData,
    candidateEntity: EntityData
  ): number {
    const fieldName = this.getFieldNameFromFactor(factor.name);
    const primaryValue = this.extractFieldValue(primaryEntity, fieldName);
    const candidateValue = this.extractFieldValue(candidateEntity, fieldName);

    if (primaryValue === null || candidateValue === null) {
      return 0;
    }

    // Normalize values for comparison
    const normalizedPrimary = this.normalizeValue(primaryValue, fieldName);
    const normalizedCandidate = this.normalizeValue(candidateValue, fieldName);

    return normalizedPrimary === normalizedCandidate ? 1.0 : 0.0;
  }

  /**
   * Fuzzy match scoring using Levenshtein distance
   */
  private computeFuzzyMatch(
    factor: SimilarityFactor,
    primaryEntity: EntityData,
    candidateEntity: EntityData
  ): number {
    const fieldName = this.getFieldNameFromFactor(factor.name);
    const primaryValue = this.extractFieldValue(primaryEntity, fieldName);
    const candidateValue = this.extractFieldValue(candidateEntity, fieldName);

    if (primaryValue === null || candidateValue === null) {
      return 0;
    }

    const str1 = String(primaryValue).toLowerCase().trim();
    const str2 = String(candidateValue).toLowerCase().trim();

    if (str1 === str2) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) {
      return 1.0;
    }

    const similarity = 1 - (distance / maxLength);

    // Apply threshold for fuzzy matching
    const threshold = factor.config.threshold || 0.7;
    return similarity >= threshold ? similarity : 0;
  }

  /**
   * Semantic similarity (placeholder - would integrate with embedding models)
   */
  private computeSemanticSimilarity(
    factor: SimilarityFactor,
    primaryEntity: EntityData,
    candidateEntity: EntityData
  ): number {
    // Placeholder for semantic similarity computation
    // In a real implementation, this would:
    // 1. Extract relevant text features
    // 2. Generate embeddings using a model
    // 3. Compute cosine similarity

    logger.debug({ factor_name: factor.name }, 'Semantic similarity not implemented, returning 0');
    return 0;
  }

  /**
   * Structural similarity (relationship patterns, etc.)
   */
  private computeStructuralSimilarity(
    factor: SimilarityFactor,
    primaryEntity: EntityData,
    candidateEntity: EntityData
  ): number {
    // Placeholder for structural similarity
    // Would analyze relationship patterns, network topology, etc.

    logger.debug({ factor_name: factor.name }, 'Structural similarity not implemented, returning 0');
    return 0;
  }

  /**
   * Determine confidence band from score
   */
  private determineConfidenceBand(score: number): 'LOW' | 'MID' | 'HIGH' {
    if (score >= this.config.high_threshold) {
      return 'HIGH';
    } else if (score >= this.config.mid_threshold) {
      return 'MID';
    } else {
      return 'LOW';
    }
  }

  /**
   * Extract field name from factor name
   */
  private getFieldNameFromFactor(factorName: string): string {
    // Extract field name from factor naming convention
    // e.g., "name_exact_match" -> "name"
    const parts = factorName.split('_');
    return parts[0];
  }

  /**
   * Extract field value from entity
   */
  private extractFieldValue(entity: EntityData, fieldName: string): any {
    // Check direct attributes first
    if (entity.attributes && entity.attributes[fieldName] !== undefined) {
      return entity.attributes[fieldName];
    }

    // Check common alternative field names
    const alternatives: Record<string, string[]> = {
      name: ['name', 'full_name', 'company_name', 'legal_name'],
      email: ['email', 'email_address', 'primary_email'],
      phone: ['phone', 'phone_number', 'primary_phone'],
      address: ['address', 'street_address', 'full_address'],
      website: ['website', 'url', 'homepage'],
      ein: ['ein', 'tax_id', 'employer_id']
    };

    if (alternatives[fieldName]) {
      for (const alt of alternatives[fieldName]) {
        if (entity.attributes && entity.attributes[alt] !== undefined) {
          return entity.attributes[alt];
        }
      }
    }

    return null;
  }

  /**
   * Normalize values for consistent comparison
   */
  private normalizeValue(value: any, fieldName: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    let normalized = String(value).toLowerCase().trim();

    // Field-specific normalization
    switch (fieldName) {
      case 'email':
        normalized = normalized.replace(/\s+/g, '');
        break;

      case 'phone':
        // Remove all non-digits, then add +1 if US number
        normalized = normalized.replace(/\D/g, '');
        if (normalized.length === 10) {
          normalized = '1' + normalized;
        }
        break;

      case 'website':
        normalized = normalized.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
        break;

      case 'name':
        // Remove common prefixes/suffixes, normalize spaces
        normalized = normalized
          .replace(/\b(inc|llc|corp|corporation|ltd|limited)\b\.?/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        break;
    }

    return normalized;
  }

  /**
   * Compute Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const matrix = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) matrix[i][0] = i;
    for (let j = 0; j <= n; j++) matrix[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[m][n];
  }

  /**
   * Load default similarity factors
   */
  private loadDefaultFactors(): void {
    const defaultFactors: SimilarityFactor[] = [
      {
        name: 'name_exact_match',
        type: 'exact_match',
        weight: 0.4,
        applicable_entity_types: ['Person', 'Company', 'Organization'],
        config: {}
      },
      {
        name: 'name_fuzzy_match',
        type: 'fuzzy_match',
        weight: 0.3,
        applicable_entity_types: ['Person', 'Company', 'Organization'],
        config: { threshold: 0.8 }
      },
      {
        name: 'email_exact_match',
        type: 'exact_match',
        weight: 0.8,
        applicable_entity_types: ['Person'],
        config: {}
      },
      {
        name: 'phone_exact_match',
        type: 'exact_match',
        weight: 0.7,
        applicable_entity_types: ['Person'],
        config: {}
      },
      {
        name: 'address_fuzzy_match',
        type: 'fuzzy_match',
        weight: 0.2,
        applicable_entity_types: ['Person', 'Company', 'Organization'],
        config: { threshold: 0.7 }
      },
      {
        name: 'ein_exact_match',
        type: 'exact_match',
        weight: 0.9,
        applicable_entity_types: ['Company'],
        config: {}
      },
      {
        name: 'website_exact_match',
        type: 'exact_match',
        weight: 0.6,
        applicable_entity_types: ['Company', 'Organization'],
        config: {}
      }
    ];

    defaultFactors.forEach(factor => {
      this.factors.set(factor.name, factor);
    });

    logger.info(`Loaded ${defaultFactors.length} default similarity factors`);
  }
}

// Default confidence engine instance
export const defaultConfidenceEngine = new ConfidenceEngine();