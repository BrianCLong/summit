/**
 * Hallucination Guard
 * Detects and prevents hallucinations in multimodal fusion outputs.
 * Implements cross-modal consistency checks and semantic validation.
 */

import pino from 'pino';

import type {
  HallucinationCheckResult,
  HallucinationReason,
  HallucinationType,
  HallucinationAction,
  FusedEmbedding,
  ModalityVector,
  ModalityType,
  TextEmbedding,
  ImageEmbedding,
  VideoEmbedding,
} from './types.js';

const logger = pino({ name: 'hallucination-guard' });

export interface HallucinationGuardConfig {
  crossModalThreshold: number;
  semanticConsistencyThreshold: number;
  confidenceAnomalyThreshold: number;
  embeddingOutlierThreshold: number;
  temporalConsistencyThreshold: number;
  entityConflictThreshold: number;
  autoRejectThreshold: number;
  autoAcceptThreshold: number;
  enableDeepValidation: boolean;
  maxValidationTime: number;
}

interface ValidationContext {
  sourceEmbeddings: Map<string, number[]>;
  entityRegistry: Map<string, EntityInfo>;
  temporalSequence: TemporalEvent[];
  crossModalPairs: CrossModalPair[];
}

interface EntityInfo {
  id: string;
  type: string;
  modality: ModalityType;
  confidence: number;
  embedding: number[];
  sourceId: string;
}

interface TemporalEvent {
  timestamp: number;
  entityId: string;
  modality: ModalityType;
  embedding: number[];
}

interface CrossModalPair {
  sourceId: string;
  targetId: string;
  sourceModality: ModalityType;
  targetModality: ModalityType;
  similarity: number;
}

export class HallucinationGuard {
  private config: HallucinationGuardConfig;
  private validationContext: ValidationContext;
  private validationStats: ValidationStats;

  constructor(config: Partial<HallucinationGuardConfig> = {}) {
    this.config = {
      crossModalThreshold: 0.6,
      semanticConsistencyThreshold: 0.7,
      confidenceAnomalyThreshold: 0.3,
      embeddingOutlierThreshold: 3.0,
      temporalConsistencyThreshold: 0.5,
      entityConflictThreshold: 0.8,
      autoRejectThreshold: 0.8,
      autoAcceptThreshold: 0.2,
      enableDeepValidation: true,
      maxValidationTime: 5000,
      ...config,
    };

    this.validationContext = {
      sourceEmbeddings: new Map(),
      entityRegistry: new Map(),
      temporalSequence: [],
      crossModalPairs: [],
    };

    this.validationStats = new ValidationStats();

    logger.info('Hallucination Guard initialized', {
      crossModalThreshold: this.config.crossModalThreshold,
      autoRejectThreshold: this.config.autoRejectThreshold,
    });
  }

  /**
   * Validate a fused embedding for hallucinations
   */
  async validate(
    fusedEmbedding: FusedEmbedding,
    sourceEmbeddings: Array<TextEmbedding | ImageEmbedding | VideoEmbedding>,
  ): Promise<HallucinationCheckResult> {
    const startTime = Date.now();

    try {
      const reasons: HallucinationReason[] = [];

      // Update context with source embeddings
      this.updateContext(sourceEmbeddings);

      // 1. Cross-modal consistency check
      const crossModalResult = await this.checkCrossModalConsistency(
        fusedEmbedding,
        sourceEmbeddings,
      );
      if (crossModalResult) {
        reasons.push(crossModalResult);
      }

      // 2. Semantic consistency check
      const semanticResult = this.checkSemanticConsistency(
        fusedEmbedding,
        sourceEmbeddings,
      );
      if (semanticResult) {
        reasons.push(semanticResult);
      }

      // 3. Confidence anomaly check
      const confidenceResult = this.checkConfidenceAnomaly(
        fusedEmbedding,
        sourceEmbeddings,
      );
      if (confidenceResult) {
        reasons.push(confidenceResult);
      }

      // 4. Embedding outlier detection
      const outlierResult = this.checkEmbeddingOutlier(fusedEmbedding);
      if (outlierResult) {
        reasons.push(outlierResult);
      }

      // 5. Temporal consistency check
      const temporalResult = this.checkTemporalConsistency(
        fusedEmbedding,
        sourceEmbeddings,
      );
      if (temporalResult) {
        reasons.push(temporalResult);
      }

      // 6. Entity conflict check
      const entityResult = this.checkEntityConflicts(
        fusedEmbedding,
        sourceEmbeddings,
      );
      if (entityResult) {
        reasons.push(entityResult);
      }

      // Calculate overall hallucination score
      const score = this.calculateHallucinationScore(reasons);
      const isHallucination = score >= this.config.autoRejectThreshold;
      const suggestedAction = this.determineSuggestedAction(score, reasons);

      // Update stats
      this.validationStats.recordValidation(score, isHallucination);

      const result: HallucinationCheckResult = {
        sourceId: fusedEmbedding.entityId,
        isHallucination,
        score,
        reasons,
        suggestedAction,
      };

      logger.info('Hallucination check completed', {
        sourceId: fusedEmbedding.entityId,
        score,
        isHallucination,
        reasonCount: reasons.length,
        processingTimeMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      logger.error('Hallucination check failed', {
        entityId: fusedEmbedding.entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return safe default (flag for review)
      return {
        sourceId: fusedEmbedding.entityId,
        isHallucination: false,
        score: 0.5,
        reasons: [{
          type: 'semantic_inconsistency',
          description: 'Validation failed - flagging for manual review',
          evidence: error instanceof Error ? error.message : 'Unknown error',
          severity: 'medium',
        }],
        suggestedAction: 'flag_for_review',
      };
    }
  }

  /**
   * Batch validate multiple fused embeddings
   */
  async validateBatch(
    fusedEmbeddings: FusedEmbedding[],
    sourceEmbeddingsMap: Map<string, Array<TextEmbedding | ImageEmbedding | VideoEmbedding>>,
  ): Promise<HallucinationCheckResult[]> {
    const results: HallucinationCheckResult[] = [];

    for (const fused of fusedEmbeddings) {
      const sources = sourceEmbeddingsMap.get(fused.entityId) || [];
      const result = await this.validate(fused, sources);
      results.push(result);
    }

    return results;
  }

  /**
   * Check cross-modal consistency between source modalities
   */
  private async checkCrossModalConsistency(
    fusedEmbedding: FusedEmbedding,
    sourceEmbeddings: Array<TextEmbedding | ImageEmbedding | VideoEmbedding>,
  ): Promise<HallucinationReason | null> {
    if (fusedEmbedding.modalityVectors.length < 2) {
      return null;
    }

    // Check pairwise consistency between modalities
    const pairs: Array<{ modalities: string; similarity: number }> = [];

    for (let i = 0; i < fusedEmbedding.modalityVectors.length; i++) {
      for (let j = i + 1; j < fusedEmbedding.modalityVectors.length; j++) {
        const a = fusedEmbedding.modalityVectors[i];
        const b = fusedEmbedding.modalityVectors[j];

        // Project to common space if dimensions differ
        const similarity = this.calculateCrossModalSimilarity(
          a.vector,
          b.vector,
          a.modality,
          b.modality,
        );

        pairs.push({
          modalities: `${a.modality}-${b.modality}`,
          similarity,
        });
      }
    }

    // Find lowest similarity pair
    const worstPair = pairs.reduce((min, p) =>
      p.similarity < min.similarity ? p : min,
    );

    if (worstPair.similarity < this.config.crossModalThreshold) {
      return {
        type: 'cross_modal_mismatch',
        description: `Low cross-modal consistency between ${worstPair.modalities}`,
        evidence: `Similarity score: ${worstPair.similarity.toFixed(3)} (threshold: ${this.config.crossModalThreshold})`,
        severity: worstPair.similarity < 0.3 ? 'critical' : 'high',
      };
    }

    return null;
  }

  /**
   * Check semantic consistency of fused embedding
   */
  private checkSemanticConsistency(
    fusedEmbedding: FusedEmbedding,
    sourceEmbeddings: Array<TextEmbedding | ImageEmbedding | VideoEmbedding>,
  ): HallucinationReason | null {
    // Check that fused embedding is semantically close to sources
    const similarities = fusedEmbedding.modalityVectors.map((mv) => {
      return this.cosineSimilarity(mv.vector, fusedEmbedding.fusedVector);
    });

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

    if (avgSimilarity < this.config.semanticConsistencyThreshold) {
      return {
        type: 'semantic_inconsistency',
        description: 'Fused embedding diverges significantly from source embeddings',
        evidence: `Average similarity to sources: ${avgSimilarity.toFixed(3)} (threshold: ${this.config.semanticConsistencyThreshold})`,
        severity: avgSimilarity < 0.5 ? 'high' : 'medium',
      };
    }

    return null;
  }

  /**
   * Check for confidence anomalies
   */
  private checkConfidenceAnomaly(
    fusedEmbedding: FusedEmbedding,
    sourceEmbeddings: Array<TextEmbedding | ImageEmbedding | VideoEmbedding>,
  ): HallucinationReason | null {
    const sourceConfidences = sourceEmbeddings.map((e) => e.metadata.confidence);
    const avgSourceConfidence = sourceConfidences.reduce((a, b) => a + b, 0) /
      sourceConfidences.length;

    // Check if fused confidence is anomalously high compared to sources
    const confidenceRatio = fusedEmbedding.crossModalScore / avgSourceConfidence;

    if (confidenceRatio > (1 + this.config.confidenceAnomalyThreshold)) {
      return {
        type: 'confidence_anomaly',
        description: 'Fused confidence is anomalously high compared to source confidences',
        evidence: `Fused confidence: ${fusedEmbedding.crossModalScore.toFixed(3)}, Avg source: ${avgSourceConfidence.toFixed(3)}`,
        severity: 'medium',
      };
    }

    // Check for very low source confidences
    const minSourceConfidence = Math.min(...sourceConfidences);
    if (minSourceConfidence < 0.3) {
      return {
        type: 'confidence_anomaly',
        description: 'One or more source embeddings have very low confidence',
        evidence: `Minimum source confidence: ${minSourceConfidence.toFixed(3)}`,
        severity: 'low',
      };
    }

    return null;
  }

  /**
   * Check if embedding is an outlier
   */
  private checkEmbeddingOutlier(
    fusedEmbedding: FusedEmbedding,
  ): HallucinationReason | null {
    // Calculate z-scores for embedding components
    const embedding = fusedEmbedding.fusedVector;

    const mean = embedding.reduce((a, b) => a + b, 0) / embedding.length;
    const variance = embedding.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
      embedding.length;
    const stdDev = Math.sqrt(variance);

    // Check for extreme values
    let outlierCount = 0;
    for (const value of embedding) {
      const zScore = stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0;
      if (zScore > this.config.embeddingOutlierThreshold) {
        outlierCount++;
      }
    }

    const outlierRatio = outlierCount / embedding.length;

    if (outlierRatio > 0.05) {
      return {
        type: 'embedding_outlier',
        description: 'Fused embedding contains unusual number of outlier values',
        evidence: `Outlier ratio: ${(outlierRatio * 100).toFixed(1)}% (threshold: 5%)`,
        severity: outlierRatio > 0.1 ? 'high' : 'medium',
      };
    }

    return null;
  }

  /**
   * Check temporal consistency
   */
  private checkTemporalConsistency(
    fusedEmbedding: FusedEmbedding,
    sourceEmbeddings: Array<TextEmbedding | ImageEmbedding | VideoEmbedding>,
  ): HallucinationReason | null {
    // Check if temporal order of sources makes sense
    const timestamps = sourceEmbeddings.map((e) => e.timestamp.getTime());
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    // Check for duplicate timestamps (possible copy-paste)
    const uniqueTimestamps = new Set(timestamps);
    if (uniqueTimestamps.size < timestamps.length * 0.5) {
      return {
        type: 'temporal_inconsistency',
        description: 'Multiple sources have identical timestamps',
        evidence: `Unique timestamps: ${uniqueTimestamps.size}/${timestamps.length}`,
        severity: 'low',
      };
    }

    // Check for suspicious time gaps
    for (let i = 1; i < sortedTimestamps.length; i++) {
      const gap = sortedTimestamps[i] - sortedTimestamps[i - 1];
      // If gap is more than 1 year, flag it
      if (gap > 365 * 24 * 60 * 60 * 1000) {
        return {
          type: 'temporal_inconsistency',
          description: 'Suspicious time gap between source timestamps',
          evidence: `Gap of ${Math.floor(gap / (24 * 60 * 60 * 1000))} days detected`,
          severity: 'medium',
        };
      }
    }

    return null;
  }

  /**
   * Check for entity conflicts
   */
  private checkEntityConflicts(
    fusedEmbedding: FusedEmbedding,
    sourceEmbeddings: Array<TextEmbedding | ImageEmbedding | VideoEmbedding>,
  ): HallucinationReason | null {
    // Check for conflicting entity information across sources
    const textEmbeddings = sourceEmbeddings.filter(
      (e): e is TextEmbedding => e.modality === 'text',
    );

    if (textEmbeddings.length < 2) {
      return null;
    }

    // Compare extracted entities across text sources
    const entitySets = textEmbeddings.map((te) => {
      const entities = te.entities || [];
      return new Map(entities.map((e) => [e.type + ':' + e.text, e]));
    });

    // Check for conflicting entities
    let conflictCount = 0;
    const conflicts: string[] = [];

    for (let i = 0; i < entitySets.length; i++) {
      for (let j = i + 1; j < entitySets.length; j++) {
        const set1 = entitySets[i];
        const set2 = entitySets[j];

        // Find same-type entities with different values
        for (const [key, entity] of set1) {
          const type = entity.type;
          const otherEntities = Array.from(set2.entries())
            .filter(([k]) => k.startsWith(type + ':'));

          for (const [otherKey, otherEntity] of otherEntities) {
            if (key !== otherKey && entity.type === otherEntity.type) {
              // Same type but different value - potential conflict
              if (this.isConflictingEntity(entity.text, otherEntity.text)) {
                conflictCount++;
                conflicts.push(`${entity.type}: "${entity.text}" vs "${otherEntity.text}"`);
              }
            }
          }
        }
      }
    }

    if (conflictCount > 0) {
      return {
        type: 'entity_conflict',
        description: 'Conflicting entity information across sources',
        evidence: `Conflicts found: ${conflicts.slice(0, 3).join('; ')}`,
        severity: conflictCount > 2 ? 'high' : 'medium',
      };
    }

    return null;
  }

  /**
   * Check if two entity values are conflicting
   */
  private isConflictingEntity(value1: string, value2: string): boolean {
    // Normalize values
    const v1 = value1.toLowerCase().trim();
    const v2 = value2.toLowerCase().trim();

    // Check if they're similar enough to be the same entity
    // but different enough to be conflicting
    const similarity = this.stringSimilarity(v1, v2);

    // If similarity is between 0.3 and 0.8, might be a conflict
    return similarity > 0.3 && similarity < 0.8;
  }

  /**
   * Calculate Jaccard similarity for strings
   */
  private stringSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/));
    const setB = new Set(b.split(/\s+/));

    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Calculate cross-modal similarity
   */
  private calculateCrossModalSimilarity(
    vectorA: number[],
    vectorB: number[],
    modalityA: ModalityType,
    modalityB: ModalityType,
  ): number {
    // If dimensions match, use cosine similarity directly
    if (vectorA.length === vectorB.length) {
      return this.cosineSimilarity(vectorA, vectorB);
    }

    // Project to common dimension using simple averaging
    const targetDim = Math.min(vectorA.length, vectorB.length);

    const projectA = this.projectVector(vectorA, targetDim);
    const projectB = this.projectVector(vectorB, targetDim);

    return this.cosineSimilarity(projectA, projectB);
  }

  /**
   * Project vector to target dimension
   */
  private projectVector(vector: number[], targetDim: number): number[] {
    if (vector.length <= targetDim) {
      return vector;
    }

    const result = new Array(targetDim).fill(0);
    const ratio = vector.length / targetDim;

    for (let i = 0; i < targetDim; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += vector[j];
      }
      result[i] = sum / (end - start);
    }

    return result;
  }

  /**
   * Calculate overall hallucination score
   */
  private calculateHallucinationScore(reasons: HallucinationReason[]): number {
    if (reasons.length === 0) {
      return 0;
    }

    const severityWeights: Record<string, number> = {
      low: 0.2,
      medium: 0.4,
      high: 0.7,
      critical: 1.0,
    };

    const typeWeights: Record<HallucinationType, number> = {
      semantic_inconsistency: 0.8,
      cross_modal_mismatch: 0.9,
      temporal_inconsistency: 0.5,
      entity_conflict: 0.7,
      confidence_anomaly: 0.4,
      embedding_outlier: 0.6,
    };

    let totalScore = 0;
    let maxScore = 0;

    for (const reason of reasons) {
      const severityWeight = severityWeights[reason.severity] || 0.5;
      const typeWeight = typeWeights[reason.type] || 0.5;
      const reasonScore = severityWeight * typeWeight;

      totalScore += reasonScore;
      maxScore = Math.max(maxScore, reasonScore);
    }

    // Combine average and max for final score
    const avgScore = totalScore / reasons.length;
    return 0.6 * maxScore + 0.4 * avgScore;
  }

  /**
   * Determine suggested action based on score
   */
  private determineSuggestedAction(
    score: number,
    reasons: HallucinationReason[],
  ): HallucinationAction {
    if (score >= this.config.autoRejectThreshold) {
      return 'reject';
    }

    if (score <= this.config.autoAcceptThreshold) {
      return 'accept';
    }

    // Check for critical reasons
    const hasCritical = reasons.some((r) => r.severity === 'critical');
    if (hasCritical) {
      return 'reject';
    }

    // Check for correctable issues
    const correctableTypes: HallucinationType[] = [
      'confidence_anomaly',
      'embedding_outlier',
    ];
    const allCorrectable = reasons.every((r) => correctableTypes.includes(r.type));
    if (allCorrectable && score < 0.5) {
      return 'auto_correct';
    }

    return 'flag_for_review';
  }

  /**
   * Update validation context with new embeddings
   */
  private updateContext(
    sourceEmbeddings: Array<TextEmbedding | ImageEmbedding | VideoEmbedding>,
  ): void {
    for (const embedding of sourceEmbeddings) {
      this.validationContext.sourceEmbeddings.set(
        embedding.id,
        embedding.vector,
      );

      // Add temporal event
      this.validationContext.temporalSequence.push({
        timestamp: embedding.timestamp.getTime(),
        entityId: embedding.id,
        modality: embedding.modality,
        embedding: embedding.vector,
      });
    }

    // Limit context size
    if (this.validationContext.temporalSequence.length > 1000) {
      this.validationContext.temporalSequence =
        this.validationContext.temporalSequence.slice(-500);
    }
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Get validation statistics
   */
  getStats(): ValidationStatsReport {
    return this.validationStats.getReport();
  }

  /**
   * Reset validation context
   */
  reset(): void {
    this.validationContext = {
      sourceEmbeddings: new Map(),
      entityRegistry: new Map(),
      temporalSequence: [],
      crossModalPairs: [],
    };
    this.validationStats.reset();
    logger.info('Hallucination guard context reset');
  }
}

/**
 * Validation statistics tracker
 */
class ValidationStats {
  private totalValidations = 0;
  private hallucinationCount = 0;
  private scoreSum = 0;
  private scoreMax = 0;
  private reasonCounts: Record<HallucinationType, number> = {
    semantic_inconsistency: 0,
    cross_modal_mismatch: 0,
    temporal_inconsistency: 0,
    entity_conflict: 0,
    confidence_anomaly: 0,
    embedding_outlier: 0,
  };

  recordValidation(score: number, isHallucination: boolean): void {
    this.totalValidations++;
    this.scoreSum += score;
    this.scoreMax = Math.max(this.scoreMax, score);
    if (isHallucination) {
      this.hallucinationCount++;
    }
  }

  recordReason(type: HallucinationType): void {
    this.reasonCounts[type]++;
  }

  getReport(): ValidationStatsReport {
    return {
      totalValidations: this.totalValidations,
      hallucinationCount: this.hallucinationCount,
      hallucinationRate: this.totalValidations > 0
        ? this.hallucinationCount / this.totalValidations
        : 0,
      averageScore: this.totalValidations > 0
        ? this.scoreSum / this.totalValidations
        : 0,
      maxScore: this.scoreMax,
      reasonCounts: { ...this.reasonCounts },
    };
  }

  reset(): void {
    this.totalValidations = 0;
    this.hallucinationCount = 0;
    this.scoreSum = 0;
    this.scoreMax = 0;
    for (const key of Object.keys(this.reasonCounts)) {
      this.reasonCounts[key as HallucinationType] = 0;
    }
  }
}

interface ValidationStatsReport {
  totalValidations: number;
  hallucinationCount: number;
  hallucinationRate: number;
  averageScore: number;
  maxScore: number;
  reasonCounts: Record<HallucinationType, number>;
}

export default HallucinationGuard;
