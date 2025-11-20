/**
 * Confidence scoring calculator
 */

import type {
  Evidence,
  ConfidenceScore,
  ConfidenceComponent,
  ConfidenceFactor,
  Uncertainty,
  SourceReliability,
  EvidenceType
} from './types.js';

export class ConfidenceCalculator {
  private sourceReliability: Map<string, SourceReliability>;

  constructor() {
    this.sourceReliability = new Map();
  }

  /**
   * Calculate confidence score from evidence
   */
  calculate(evidence: Evidence[]): ConfidenceScore {
    if (evidence.length === 0) {
      return {
        overall: 0,
        components: [],
        factors: [],
        uncertainties: [
          {
            type: 'missing_data',
            level: 1.0,
            description: 'No evidence provided'
          }
        ]
      };
    }

    const components = this.calculateComponents(evidence);
    const factors = this.identifyFactors(evidence);
    const uncertainties = this.identifyUncertainties(evidence);

    // Calculate overall confidence
    let weightedSum = 0;
    let totalWeight = 0;

    for (const component of components) {
      weightedSum += component.score * component.weight;
      totalWeight += component.weight;
    }

    const baseConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply factors
    let adjustedConfidence = baseConfidence;

    for (const factor of factors) {
      if (factor.type === 'positive') {
        adjustedConfidence += factor.impact * (1 - adjustedConfidence);
      } else {
        adjustedConfidence -= factor.impact * adjustedConfidence;
      }
    }

    // Apply uncertainty penalty
    const uncertaintyPenalty = uncertainties.reduce(
      (sum, u) => sum + u.level * 0.1,
      0
    );
    adjustedConfidence = Math.max(0, adjustedConfidence - uncertaintyPenalty);

    return {
      overall: Math.min(1, adjustedConfidence),
      components,
      factors,
      uncertainties
    };
  }

  /**
   * Calculate confidence components
   */
  private calculateComponents(evidence: Evidence[]): ConfidenceComponent[] {
    const components: ConfidenceComponent[] = [];

    // Group evidence by type
    const byType = new Map<EvidenceType, Evidence[]>();

    for (const e of evidence) {
      const group = byType.get(e.type) || [];
      group.push(e);
      byType.set(e.type, group);
    }

    // Calculate component for each type
    for (const [type, group] of byType) {
      const score = this.calculateTypeScore(group);
      const weight = this.getTypeWeight(type);

      components.push({
        name: type,
        score,
        weight,
        contribution: score * weight
      });
    }

    // Normalize weights
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);

    if (totalWeight > 0) {
      for (const component of components) {
        component.weight /= totalWeight;
        component.contribution = component.score * component.weight;
      }
    }

    return components;
  }

  /**
   * Calculate score for evidence group
   */
  private calculateTypeScore(evidence: Evidence[]): number {
    let totalStrength = 0;
    let totalReliability = 0;
    let count = 0;

    for (const e of evidence) {
      const sourceReliability = this.getSourceReliability(e.source);
      totalStrength += e.strength;
      totalReliability += e.reliability * sourceReliability;
      count++;
    }

    const avgStrength = totalStrength / count;
    const avgReliability = totalReliability / count;

    // Combined score with diminishing returns for multiple items
    const multiplier = Math.min(1, Math.log(count + 1) / Math.log(5));

    return (avgStrength * 0.6 + avgReliability * 0.4) * (0.7 + 0.3 * multiplier);
  }

  /**
   * Get weight for evidence type
   */
  private getTypeWeight(type: EvidenceType): number {
    const weights: Record<EvidenceType, number> = {
      digital_footprint: 0.8,
      identity_match: 0.9,
      network_connection: 0.7,
      behavioral_pattern: 0.75,
      temporal_correlation: 0.6,
      spatial_correlation: 0.65,
      linguistic_analysis: 0.7,
      technical_indicator: 0.85,
      document_analysis: 0.8,
      witness_testimony: 0.6
    };

    return weights[type] || 0.5;
  }

  /**
   * Get source reliability
   */
  private getSourceReliability(source: string): number {
    const reliability = this.sourceReliability.get(source);
    return reliability ? reliability.reliability : 0.7; // Default
  }

  /**
   * Set source reliability
   */
  setSourceReliability(reliability: SourceReliability): void {
    this.sourceReliability.set(reliability.source, reliability);
  }

  /**
   * Identify confidence factors
   */
  private identifyFactors(evidence: Evidence[]): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];

    // Multiple independent sources
    const sources = new Set(evidence.map(e => e.source));
    if (sources.size >= 3) {
      factors.push({
        name: 'multiple_sources',
        type: 'positive',
        impact: 0.1,
        description: `Evidence from ${sources.size} independent sources`
      });
    }

    // Recent evidence
    const recentEvidence = evidence.filter(e => {
      const age = Date.now() - e.timestamp.getTime();
      return age < 30 * 24 * 60 * 60 * 1000; // 30 days
    });

    if (recentEvidence.length / evidence.length > 0.7) {
      factors.push({
        name: 'recent_evidence',
        type: 'positive',
        impact: 0.05,
        description: 'Majority of evidence is recent'
      });
    }

    // High-reliability sources
    const highReliability = evidence.filter(e => e.reliability > 0.8);
    if (highReliability.length / evidence.length > 0.5) {
      factors.push({
        name: 'high_reliability',
        type: 'positive',
        impact: 0.1,
        description: 'Majority of evidence from high-reliability sources'
      });
    }

    // Weak evidence
    const weakEvidence = evidence.filter(e => e.strength < 0.4);
    if (weakEvidence.length / evidence.length > 0.3) {
      factors.push({
        name: 'weak_evidence',
        type: 'negative',
        impact: 0.15,
        description: 'Significant portion of evidence is weak'
      });
    }

    // Inconsistent timestamps
    if (evidence.length > 2) {
      const timestamps = evidence.map(e => e.timestamp.getTime());
      const span = Math.max(...timestamps) - Math.min(...timestamps);
      const oneYear = 365 * 24 * 60 * 60 * 1000;

      if (span > oneYear) {
        factors.push({
          name: 'temporal_inconsistency',
          type: 'negative',
          impact: 0.08,
          description: 'Evidence spans a long time period'
        });
      }
    }

    return factors;
  }

  /**
   * Identify uncertainties
   */
  private identifyUncertainties(evidence: Evidence[]): Uncertainty[] {
    const uncertainties: Uncertainty[] = [];

    // Check data quality
    const avgReliability =
      evidence.reduce((sum, e) => sum + e.reliability, 0) / evidence.length;

    if (avgReliability < 0.6) {
      uncertainties.push({
        type: 'data_quality',
        level: 1 - avgReliability,
        description: 'Low average data quality',
        mitigation: 'Obtain additional high-quality evidence'
      });
    }

    // Check for conflicting evidence
    const conflicts = this.detectConflicts(evidence);
    if (conflicts > 0) {
      uncertainties.push({
        type: 'conflicting_evidence',
        level: Math.min(1, conflicts * 0.2),
        description: `${conflicts} conflicting evidence items`,
        mitigation: 'Resolve conflicts through additional investigation'
      });
    }

    // Check evidence diversity
    const types = new Set(evidence.map(e => e.type));
    if (types.size < 2 && evidence.length > 2) {
      uncertainties.push({
        type: 'missing_data',
        level: 0.3,
        description: 'Limited evidence type diversity',
        mitigation: 'Gather evidence from different types of sources'
      });
    }

    // Check temporal gaps
    if (evidence.length > 1) {
      const timestamps = evidence
        .map(e => e.timestamp.getTime())
        .sort((a, b) => a - b);

      let maxGap = 0;
      for (let i = 1; i < timestamps.length; i++) {
        const gap = timestamps[i] - timestamps[i - 1];
        maxGap = Math.max(maxGap, gap);
      }

      const sixMonths = 180 * 24 * 60 * 60 * 1000;
      if (maxGap > sixMonths) {
        uncertainties.push({
          type: 'temporal_gap',
          level: 0.4,
          description: 'Large temporal gap in evidence',
          mitigation: 'Investigate activity during gap period'
        });
      }
    }

    return uncertainties;
  }

  /**
   * Detect conflicting evidence
   */
  private detectConflicts(evidence: Evidence[]): number {
    // Group by type and check for contradictions
    const byType = new Map<EvidenceType, Evidence[]>();

    for (const e of evidence) {
      const group = byType.get(e.type) || [];
      group.push(e);
      byType.set(e.type, group);
    }

    let conflicts = 0;

    for (const group of byType.values()) {
      if (group.length > 1) {
        // Check if values differ significantly
        const values = group.map(e => JSON.stringify(e.value));
        const unique = new Set(values);

        if (unique.size > 1) {
          conflicts++;
        }
      }
    }

    return conflicts;
  }
}
