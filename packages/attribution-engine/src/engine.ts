/**
 * Core attribution engine
 */

import type {
  Attribution,
  Evidence,
  Hypothesis,
  AttributionMethod,
  AttributionMetadata,
  EvidenceType
} from './types.js';
import { ConfidenceCalculator } from './confidence.js';

export class AttributionEngine {
  private attributions: Map<string, Attribution>;
  private confidenceCalculator: ConfidenceCalculator;

  constructor() {
    this.attributions = new Map();
    this.confidenceCalculator = new ConfidenceCalculator();
  }

  /**
   * Create a new attribution
   */
  createAttribution(
    targetEntity: string,
    attributedTo: string,
    method: AttributionMethod,
    evidence: Evidence[]
  ): Attribution {
    const id = this.generateId();

    const confidence = this.confidenceCalculator.calculate(evidence);

    const attribution: Attribution = {
      id,
      targetEntity,
      attributedTo,
      confidence: confidence.overall,
      method,
      evidence,
      hypotheses: [],
      metadata: {
        reviewed: false,
        tags: [],
        classification: 'unclassified',
        notes: ''
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.attributions.set(id, attribution);

    return attribution;
  }

  /**
   * Add evidence to attribution
   */
  addEvidence(attributionId: string, evidence: Evidence): void {
    const attribution = this.attributions.get(attributionId);

    if (!attribution) {
      throw new Error(`Attribution ${attributionId} not found`);
    }

    attribution.evidence.push(evidence);
    attribution.confidence = this.confidenceCalculator.calculate(
      attribution.evidence
    ).overall;
    attribution.updatedAt = new Date();
  }

  /**
   * Add hypothesis to attribution
   */
  addHypothesis(attributionId: string, hypothesis: Hypothesis): void {
    const attribution = this.attributions.get(attributionId);

    if (!attribution) {
      throw new Error(`Attribution ${attributionId} not found`);
    }

    attribution.hypotheses.push(hypothesis);
    attribution.updatedAt = new Date();
  }

  /**
   * Update attribution metadata
   */
  updateMetadata(attributionId: string, metadata: Partial<AttributionMetadata>): void {
    const attribution = this.attributions.get(attributionId);

    if (!attribution) {
      throw new Error(`Attribution ${attributionId} not found`);
    }

    attribution.metadata = {
      ...attribution.metadata,
      ...metadata
    };
    attribution.updatedAt = new Date();
  }

  /**
   * Mark attribution as reviewed
   */
  markAsReviewed(
    attributionId: string,
    reviewedBy: string,
    notes?: string
  ): void {
    const attribution = this.attributions.get(attributionId);

    if (!attribution) {
      throw new Error(`Attribution ${attributionId} not found`);
    }

    attribution.metadata.reviewed = true;
    attribution.metadata.reviewedBy = reviewedBy;
    attribution.metadata.reviewedAt = new Date();

    if (notes) {
      attribution.metadata.notes = notes;
    }

    attribution.updatedAt = new Date();
  }

  /**
   * Get attribution by ID
   */
  getAttribution(id: string): Attribution | undefined {
    return this.attributions.get(id);
  }

  /**
   * Find attributions by target entity
   */
  findByTargetEntity(targetEntity: string): Attribution[] {
    return Array.from(this.attributions.values()).filter(
      a => a.targetEntity === targetEntity
    );
  }

  /**
   * Find attributions by attributed entity
   */
  findByAttributedEntity(attributedTo: string): Attribution[] {
    return Array.from(this.attributions.values()).filter(
      a => a.attributedTo === attributedTo
    );
  }

  /**
   * Get high-confidence attributions
   */
  getHighConfidenceAttributions(threshold: number = 0.8): Attribution[] {
    return Array.from(this.attributions.values()).filter(
      a => a.confidence >= threshold
    );
  }

  /**
   * Get attributions requiring review
   */
  getUnreviewedAttributions(): Attribution[] {
    return Array.from(this.attributions.values()).filter(
      a => !a.metadata.reviewed
    );
  }

  /**
   * Calculate evidence strength
   */
  calculateEvidenceStrength(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    let totalStrength = 0;
    let totalWeight = 0;

    for (const e of evidence) {
      const weight = e.reliability;
      totalStrength += e.strength * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalStrength / totalWeight : 0;
  }

  /**
   * Validate attribution consistency
   */
  validateConsistency(attribution: Attribution): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for conflicting evidence
    const evidenceValues = new Map<EvidenceType, any[]>();

    for (const evidence of attribution.evidence) {
      const values = evidenceValues.get(evidence.type) || [];
      values.push(evidence.value);
      evidenceValues.set(evidence.type, values);
    }

    for (const [type, values] of evidenceValues) {
      if (values.length > 1) {
        const unique = new Set(values.map(v => JSON.stringify(v)));
        if (unique.size > 1) {
          issues.push(`Conflicting evidence for type ${type}`);
        }
      }
    }

    // Check if confidence matches evidence strength
    const evidenceStrength = this.calculateEvidenceStrength(attribution.evidence);
    const confidenceDiff = Math.abs(attribution.confidence - evidenceStrength);

    if (confidenceDiff > 0.2) {
      issues.push('Confidence score does not match evidence strength');
    }

    // Check if reviewed attributions have reviewer
    if (attribution.metadata.reviewed && !attribution.metadata.reviewedBy) {
      issues.push('Attribution marked as reviewed but no reviewer specified');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Merge two attributions
   */
  mergeAttributions(id1: string, id2: string): Attribution {
    const attr1 = this.attributions.get(id1);
    const attr2 = this.attributions.get(id2);

    if (!attr1 || !attr2) {
      throw new Error('One or both attributions not found');
    }

    // Combine evidence
    const mergedEvidence = [...attr1.evidence, ...attr2.evidence];

    // Combine hypotheses
    const mergedHypotheses = [...attr1.hypotheses, ...attr2.hypotheses];

    // Recalculate confidence
    const confidence = this.confidenceCalculator.calculate(mergedEvidence);

    // Create merged attribution
    const merged: Attribution = {
      id: this.generateId(),
      targetEntity: attr1.targetEntity,
      attributedTo: attr1.attributedTo,
      confidence: confidence.overall,
      method: 'hybrid',
      evidence: mergedEvidence,
      hypotheses: mergedHypotheses,
      metadata: {
        ...attr1.metadata,
        notes: `Merged from ${id1} and ${id2}`
      },
      createdAt: new Date(
        Math.min(attr1.createdAt.getTime(), attr2.createdAt.getTime())
      ),
      updatedAt: new Date()
    };

    this.attributions.set(merged.id, merged);

    // Remove old attributions
    this.attributions.delete(id1);
    this.attributions.delete(id2);

    return merged;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    reviewed: number;
    unreviewed: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    averageConfidence: number;
  } {
    const attributions = Array.from(this.attributions.values());

    const reviewed = attributions.filter(a => a.metadata.reviewed).length;
    const highConf = attributions.filter(a => a.confidence >= 0.8).length;
    const medConf = attributions.filter(
      a => a.confidence >= 0.5 && a.confidence < 0.8
    ).length;
    const lowConf = attributions.filter(a => a.confidence < 0.5).length;

    const avgConf =
      attributions.length > 0
        ? attributions.reduce((sum, a) => sum + a.confidence, 0) /
          attributions.length
        : 0;

    return {
      total: attributions.length,
      reviewed,
      unreviewed: attributions.length - reviewed,
      highConfidence: highConf,
      mediumConfidence: medConf,
      lowConfidence: lowConf,
      averageConfidence: avgConf
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.attributions.clear();
  }
}
