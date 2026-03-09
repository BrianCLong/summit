/**
 * HallucinationGuard - Multi-layer validation for OSINT data integrity
 *
 * Implements defense-in-depth validation to prevent hallucinated/fabricated
 * intelligence from entering the knowledge graph. Targets 85%+ validation rate.
 */

import crypto from 'crypto';
import {
  OsintEntity,
  OsintRelationship,
  OsintSourceReference,
  ValidationStatus,
  HallucinationCheckResult,
  OsintSourceType,
} from './types';

export interface HallucinationGuardConfig {
  minCorroboratingSourceCount: number;
  confidenceThreshold: number;
  temporalToleranceMs: number;
  semanticSimilarityThreshold: number;
  enableStrictMode: boolean;
}

const DEFAULT_CONFIG: HallucinationGuardConfig = {
  minCorroboratingSourceCount: 2,
  confidenceThreshold: 0.7,
  temporalToleranceMs: 86400000, // 24 hours
  semanticSimilarityThreshold: 0.75,
  enableStrictMode: false,
};

export class HallucinationGuard {
  private config: HallucinationGuardConfig;
  private validationCache: Map<string, HallucinationCheckResult>;
  private metrics: {
    totalChecks: number;
    passed: number;
    failed: number;
    reviewRequired: number;
  };

  constructor(config: Partial<HallucinationGuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validationCache = new Map();
    this.metrics = {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      reviewRequired: 0,
    };
  }

  /**
   * Validate an entity against hallucination checks
   */
  async validateEntity(
    entity: OsintEntity,
    existingEntities: OsintEntity[] = [],
  ): Promise<HallucinationCheckResult> {
    const cacheKey = this.computeCacheKey(entity);
    const cached = this.validationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    this.metrics.totalChecks++;

    const checks: HallucinationCheckResult['checks'] = [];

    // Check 1: Multi-source corroboration
    const sourceCheck = this.checkSourceCorroboration(entity);
    checks.push(sourceCheck);

    // Check 2: Cross-reference against existing entities
    const crossRefCheck = this.checkCrossReference(entity, existingEntities);
    checks.push(crossRefCheck);

    // Check 3: Temporal consistency
    const temporalCheck = this.checkTemporalConsistency(entity);
    checks.push(temporalCheck);

    // Check 4: Semantic coherence
    const semanticCheck = this.checkSemanticCoherence(entity);
    checks.push(semanticCheck);

    // Calculate overall result
    const passedChecks = checks.filter((c) => c.passed).length;
    const totalChecks = checks.length;
    const confidence = passedChecks / totalChecks;

    let recommendation: 'accept' | 'review' | 'reject';
    let isHallucinated: boolean;

    if (confidence >= this.config.confidenceThreshold) {
      recommendation = 'accept';
      isHallucinated = false;
      this.metrics.passed++;
    } else if (confidence >= this.config.confidenceThreshold * 0.6) {
      recommendation = 'review';
      isHallucinated = false;
      this.metrics.reviewRequired++;
    } else {
      recommendation = 'reject';
      isHallucinated = true;
      this.metrics.failed++;
    }

    const result: HallucinationCheckResult = {
      entityId: entity.id,
      isHallucinated,
      confidence,
      checks,
      recommendation,
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Validate a relationship between entities
   */
  async validateRelationship(
    relationship: OsintRelationship,
    sourceEntity: OsintEntity,
    targetEntity: OsintEntity,
  ): Promise<HallucinationCheckResult> {
    const cacheKey = `rel:${relationship.id}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    this.metrics.totalChecks++;

    const checks: HallucinationCheckResult['checks'] = [];

    // Check 1: Both entities exist and are validated
    const entityValidationCheck = {
      type: 'source_count' as const,
      passed: sourceEntity.validationStatus.validated && targetEntity.validationStatus.validated,
      details: `Source entity validated: ${sourceEntity.validationStatus.validated}, Target entity validated: ${targetEntity.validationStatus.validated}`,
    };
    checks.push(entityValidationCheck);

    // Check 2: Relationship source corroboration
    const sourceCheck = this.checkRelationshipSourceCorroboration(relationship);
    checks.push(sourceCheck);

    // Check 3: Temporal plausibility
    const temporalCheck = this.checkRelationshipTemporalPlausibility(
      relationship,
      sourceEntity,
      targetEntity,
    );
    checks.push(temporalCheck);

    // Check 4: Semantic plausibility
    const semanticCheck = this.checkRelationshipSemanticPlausibility(
      relationship,
      sourceEntity,
      targetEntity,
    );
    checks.push(semanticCheck);

    const passedChecks = checks.filter((c) => c.passed).length;
    const confidence = passedChecks / checks.length;

    let recommendation: 'accept' | 'review' | 'reject';
    let isHallucinated: boolean;

    if (confidence >= this.config.confidenceThreshold) {
      recommendation = 'accept';
      isHallucinated = false;
      this.metrics.passed++;
    } else if (confidence >= this.config.confidenceThreshold * 0.6) {
      recommendation = 'review';
      isHallucinated = false;
      this.metrics.reviewRequired++;
    } else {
      recommendation = 'reject';
      isHallucinated = true;
      this.metrics.failed++;
    }

    const result: HallucinationCheckResult = {
      entityId: relationship.id,
      isHallucinated,
      confidence,
      checks,
      recommendation,
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Batch validate entities with optimized processing
   */
  async batchValidate(
    entities: OsintEntity[],
  ): Promise<Map<string, HallucinationCheckResult>> {
    const results = new Map<string, HallucinationCheckResult>();

    // Build cross-reference index
    const entityIndex = new Map<string, OsintEntity>();
    for (const entity of entities) {
      entityIndex.set(entity.id, entity);
    }

    // Validate in parallel batches
    const batchSize = 50;
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const validationPromises = batch.map((entity) =>
        this.validateEntity(entity, entities),
      );
      const batchResults = await Promise.all(validationPromises);

      for (let j = 0; j < batch.length; j++) {
        results.set(batch[j].id, batchResults[j]);
      }
    }

    return results;
  }

  /**
   * Check source corroboration for an entity
   */
  private checkSourceCorroboration(entity: OsintEntity): HallucinationCheckResult['checks'][0] {
    const uniqueSources = new Set(entity.sources.map((s) => s.sourceType));
    const sourceCount = uniqueSources.size;
    const reliableSources = entity.sources.filter(
      (s) => s.reliability === 'A' || s.reliability === 'B',
    );

    const passed =
      sourceCount >= this.config.minCorroboratingSourceCount ||
      reliableSources.length >= 1;

    return {
      type: 'source_count',
      passed,
      details: `Found ${sourceCount} unique source types (required: ${this.config.minCorroboratingSourceCount}), ${reliableSources.length} reliable sources`,
    };
  }

  /**
   * Check cross-reference against existing entities
   */
  private checkCrossReference(
    entity: OsintEntity,
    existingEntities: OsintEntity[],
  ): HallucinationCheckResult['checks'][0] {
    if (existingEntities.length === 0) {
      return {
        type: 'cross_reference',
        passed: true,
        details: 'No existing entities to cross-reference (new graph)',
      };
    }

    // Check for matching labels or aliases
    const normalizedLabel = this.normalizeText(entity.label);
    const normalizedAliases = entity.aliases.map((a) => this.normalizeText(a));

    let matchFound = false;
    let matchDetails = '';

    for (const existing of existingEntities) {
      if (existing.id === entity.id) continue;

      const existingNormalizedLabel = this.normalizeText(existing.label);
      const existingNormalizedAliases = existing.aliases.map((a) => this.normalizeText(a));

      // Check label match
      if (normalizedLabel === existingNormalizedLabel) {
        matchFound = true;
        matchDetails = `Label match with entity ${existing.id}`;
        break;
      }

      // Check alias match
      for (const alias of normalizedAliases) {
        if (
          existingNormalizedAliases.includes(alias) ||
          existingNormalizedLabel === alias
        ) {
          matchFound = true;
          matchDetails = `Alias match with entity ${existing.id}`;
          break;
        }
      }

      if (matchFound) break;
    }

    // If no existing match but entity has multiple sources, still pass
    if (!matchFound && entity.sources.length >= 2) {
      return {
        type: 'cross_reference',
        passed: true,
        details: 'No existing match, but multiple sources corroborate',
      };
    }

    return {
      type: 'cross_reference',
      passed: matchFound || entity.sources.length >= 2,
      details: matchFound ? matchDetails : 'No cross-reference found',
    };
  }

  /**
   * Check temporal consistency of entity data
   */
  private checkTemporalConsistency(
    entity: OsintEntity,
  ): HallucinationCheckResult['checks'][0] {
    const now = Date.now();
    const createdAt = entity.createdAt.getTime();
    const updatedAt = entity.updatedAt.getTime();

    // Check that dates are not in the future
    if (createdAt > now || updatedAt > now) {
      return {
        type: 'temporal_consistency',
        passed: false,
        details: 'Entity has future timestamps',
      };
    }

    // Check that updatedAt >= createdAt
    if (updatedAt < createdAt) {
      return {
        type: 'temporal_consistency',
        passed: false,
        details: 'updatedAt is before createdAt',
      };
    }

    // Check source timestamps are consistent
    for (const source of entity.sources) {
      const sourceTime = source.timestamp.getTime();
      if (sourceTime > now + this.config.temporalToleranceMs) {
        return {
          type: 'temporal_consistency',
          passed: false,
          details: `Source ${source.sourceId} has future timestamp`,
        };
      }
    }

    return {
      type: 'temporal_consistency',
      passed: true,
      details: 'All timestamps are consistent',
    };
  }

  /**
   * Check semantic coherence of entity data
   */
  private checkSemanticCoherence(
    entity: OsintEntity,
  ): HallucinationCheckResult['checks'][0] {
    const issues: string[] = [];

    // Check label is meaningful
    if (!entity.label || entity.label.trim().length < 2) {
      issues.push('Label is missing or too short');
    }

    // Check for suspicious patterns (e.g., generated gibberish)
    if (this.detectGibberish(entity.label)) {
      issues.push('Label appears to be gibberish');
    }

    // Check entity type matches content
    if (entity.type === 'person' && entity.attributes.domain) {
      // Persons shouldn't have domain attributes
      issues.push('Person entity has domain attribute');
    }

    if (entity.type === 'organization' && entity.attributes.birthDate) {
      // Organizations shouldn't have birth dates
      issues.push('Organization entity has birthDate attribute');
    }

    // Check confidence is within bounds
    if (entity.confidence < 0 || entity.confidence > 1) {
      issues.push('Confidence out of valid range [0,1]');
    }

    return {
      type: 'semantic_coherence',
      passed: issues.length === 0,
      details: issues.length === 0 ? 'Entity is semantically coherent' : issues.join('; '),
    };
  }

  /**
   * Check relationship source corroboration
   */
  private checkRelationshipSourceCorroboration(
    relationship: OsintRelationship,
  ): HallucinationCheckResult['checks'][0] {
    const uniqueSources = new Set(relationship.sources.map((s) => s.sourceType));
    const sourceCount = uniqueSources.size;

    // Relationships typically need fewer sources to be valid
    const minSources = Math.max(1, this.config.minCorroboratingSourceCount - 1);

    return {
      type: 'source_count',
      passed: sourceCount >= minSources,
      details: `Relationship has ${sourceCount} unique source types (minimum: ${minSources})`,
    };
  }

  /**
   * Check temporal plausibility of relationship
   */
  private checkRelationshipTemporalPlausibility(
    relationship: OsintRelationship,
    sourceEntity: OsintEntity,
    targetEntity: OsintEntity,
  ): HallucinationCheckResult['checks'][0] {
    // If temporal bounds are specified, check they make sense
    if (relationship.temporalBounds) {
      const { start, end } = relationship.temporalBounds;

      if (start && end && start > end) {
        return {
          type: 'temporal_consistency',
          passed: false,
          details: 'Relationship start time is after end time',
        };
      }

      // Check relationship doesn't predate both entities
      const earliestEntityTime = Math.min(
        sourceEntity.createdAt.getTime(),
        targetEntity.createdAt.getTime(),
      );

      if (start && start.getTime() < earliestEntityTime - this.config.temporalToleranceMs) {
        return {
          type: 'temporal_consistency',
          passed: false,
          details: 'Relationship predates both entities',
        };
      }
    }

    return {
      type: 'temporal_consistency',
      passed: true,
      details: 'Relationship temporal bounds are plausible',
    };
  }

  /**
   * Check semantic plausibility of relationship
   */
  private checkRelationshipSemanticPlausibility(
    relationship: OsintRelationship,
    sourceEntity: OsintEntity,
    targetEntity: OsintEntity,
  ): HallucinationCheckResult['checks'][0] {
    // Define allowed relationship types per entity type pair
    const allowedRelationships: Record<string, Set<string>> = {
      'person:person': new Set([
        'associated_with',
        'related_to',
        'communicates_with',
        'alias_of',
      ]),
      'person:organization': new Set([
        'member_of',
        'owns',
        'controls',
        'associated_with',
      ]),
      'person:location': new Set(['located_at', 'associated_with']),
      'organization:organization': new Set([
        'associated_with',
        'part_of',
        'owns',
        'controls',
        'transacts_with',
      ]),
      'organization:location': new Set([
        'located_at',
        'associated_with',
        'controls',
      ]),
      'cyber_artifact:infrastructure': new Set([
        'associated_with',
        'part_of',
        'located_at',
      ]),
    };

    const pairKey = `${sourceEntity.type}:${targetEntity.type}`;
    const reversePairKey = `${targetEntity.type}:${sourceEntity.type}`;

    const allowed =
      allowedRelationships[pairKey] || allowedRelationships[reversePairKey];

    if (!allowed) {
      // Unknown pair - allow with reduced confidence
      return {
        type: 'semantic_coherence',
        passed: true,
        details: `Unknown entity type pair ${pairKey}, allowing with caution`,
      };
    }

    const isAllowed = allowed.has(relationship.type);

    return {
      type: 'semantic_coherence',
      passed: isAllowed,
      details: isAllowed
        ? `Relationship type ${relationship.type} is valid for ${pairKey}`
        : `Relationship type ${relationship.type} is not typical for ${pairKey}`,
    };
  }

  /**
   * Detect gibberish/randomly generated text
   */
  private detectGibberish(text: string): boolean {
    if (!text) return true;

    // Check for excessive consonant clusters
    const consonantClusterRegex = /[bcdfghjklmnpqrstvwxyz]{5,}/i;
    if (consonantClusterRegex.test(text)) {
      return true;
    }

    // Check for too many numbers
    const numberRatio = (text.match(/\d/g) || []).length / text.length;
    if (numberRatio > 0.5) {
      return true;
    }

    // Check for repeating patterns
    const repeatingPattern = /(.)\1{4,}/;
    if (repeatingPattern.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Compute cache key for entity
   */
  private computeCacheKey(entity: OsintEntity): string {
    const data = JSON.stringify({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      sources: entity.sources.map((s) => s.sourceId).sort(),
    });
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Create validated status object
   */
  createValidationStatus(
    checkResult: HallucinationCheckResult,
    validator: ValidationStatus['validator'] = 'multi_source',
  ): ValidationStatus {
    return {
      validated: !checkResult.isHallucinated,
      validatedAt: new Date(),
      validator,
      confidence: checkResult.confidence,
      corroboratingSourceCount: checkResult.checks.filter((c) => c.passed).length,
      conflictingSources: [],
      hallucinationRisk: checkResult.isHallucinated
        ? 'high'
        : checkResult.confidence >= 0.8
          ? 'low'
          : 'medium',
      notes: checkResult.checks.map((c) => `${c.type}: ${c.details}`).join('; '),
    };
  }

  /**
   * Get validation metrics
   */
  getMetrics(): {
    totalChecks: number;
    passed: number;
    failed: number;
    reviewRequired: number;
    validationRate: number;
  } {
    const validationRate =
      this.metrics.totalChecks > 0
        ? this.metrics.passed / this.metrics.totalChecks
        : 0;

    return {
      ...this.metrics,
      validationRate,
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      reviewRequired: 0,
    };
  }
}
