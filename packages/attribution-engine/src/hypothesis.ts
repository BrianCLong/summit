/**
 * Hypothesis analysis and comparison
 */

import type {
  Hypothesis,
  Evidence,
  CompetingHypothesis,
  HypothesisComparison
} from './types.js';

export class HypothesisAnalyzer {
  /**
   * Create a new hypothesis
   */
  createHypothesis(
    description: string,
    supportingEvidence: string[],
    contradictingEvidence: string[] = []
  ): Hypothesis {
    const confidence = this.calculateHypothesisConfidence(
      supportingEvidence,
      contradictingEvidence
    );

    const likelihood = this.estimateLikelihood(
      supportingEvidence.length,
      contradictingEvidence.length
    );

    return {
      id: this.generateId(),
      description,
      confidence,
      supportingEvidence,
      contradictingEvidence,
      likelihood,
      impact: this.assessImpact(confidence, likelihood)
    };
  }

  /**
   * Calculate hypothesis confidence
   */
  private calculateHypothesisConfidence(
    supporting: string[],
    contradicting: string[]
  ): number {
    const supportScore = supporting.length;
    const contradictScore = contradicting.length;
    const total = supportScore + contradictScore;

    if (total === 0) return 0;

    // Confidence increases with supporting evidence
    // and decreases with contradicting evidence
    const baseConfidence = supportScore / total;

    // Bonus for having multiple supporting evidence
    const bonus = Math.min(0.2, supporting.length * 0.05);

    // Penalty for contradicting evidence
    const penalty = Math.min(0.3, contradicting.length * 0.1);

    return Math.max(0, Math.min(1, baseConfidence + bonus - penalty));
  }

  /**
   * Estimate likelihood
   */
  private estimateLikelihood(supportCount: number, contradictCount: number): number {
    if (supportCount === 0) return 0;

    const ratio = supportCount / (supportCount + contradictCount);

    // Apply sigmoid-like function
    return 1 / (1 + Math.exp(-5 * (ratio - 0.5)));
  }

  /**
   * Assess impact level
   */
  private assessImpact(
    confidence: number,
    likelihood: number
  ): 'low' | 'medium' | 'high' {
    const score = confidence * likelihood;

    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Compare competing hypotheses
   */
  compareHypotheses(hypotheses: Hypothesis[]): CompetingHypothesis | null {
    if (hypotheses.length === 0) return null;

    // Sort by confidence
    const sorted = [...hypotheses].sort((a, b) => b.confidence - a.confidence);

    const primary = sorted[0];
    const alternatives = sorted.slice(1);

    const analysis = this.analyzeComparison(primary, alternatives);

    return {
      primary,
      alternatives,
      analysis
    };
  }

  /**
   * Analyze hypothesis comparison
   */
  private analyzeComparison(
    primary: Hypothesis,
    alternatives: Hypothesis[]
  ): HypothesisComparison {
    const confidenceGap =
      alternatives.length > 0
        ? primary.confidence - alternatives[0].confidence
        : primary.confidence;

    // Find critical evidence (unique to primary)
    const criticalEvidence = primary.supportingEvidence.filter(
      e => !alternatives.some(alt => alt.supportingEvidence.includes(e))
    );

    // Identify weaknesses for each hypothesis
    const weaknesses: Record<string, string[]> = {};

    weaknesses[primary.id] = this.identifyWeaknesses(primary);

    for (const alt of alternatives) {
      weaknesses[alt.id] = this.identifyWeaknesses(alt);
    }

    return {
      winner: primary.id,
      confidenceGap,
      criticalEvidence,
      weaknesses
    };
  }

  /**
   * Identify hypothesis weaknesses
   */
  private identifyWeaknesses(hypothesis: Hypothesis): string[] {
    const weaknesses: string[] = [];

    if (hypothesis.supportingEvidence.length < 2) {
      weaknesses.push('Limited supporting evidence');
    }

    if (hypothesis.contradictingEvidence.length > 0) {
      weaknesses.push(
        `${hypothesis.contradictingEvidence.length} contradicting evidence items`
      );
    }

    if (hypothesis.confidence < 0.6) {
      weaknesses.push('Low confidence score');
    }

    if (hypothesis.likelihood < 0.5) {
      weaknesses.push('Low likelihood estimate');
    }

    return weaknesses;
  }

  /**
   * Test hypothesis against new evidence
   */
  testHypothesis(
    hypothesis: Hypothesis,
    newEvidence: Evidence
  ): {
    supports: boolean;
    strength: number;
    updatedHypothesis: Hypothesis;
  } {
    // Determine if evidence supports or contradicts
    const supports = this.doesEvidenceSupport(hypothesis, newEvidence);
    const strength = newEvidence.strength;

    // Update hypothesis
    const updatedHypothesis = { ...hypothesis };

    if (supports) {
      updatedHypothesis.supportingEvidence.push(newEvidence.id);
    } else {
      updatedHypothesis.contradictingEvidence.push(newEvidence.id);
    }

    // Recalculate confidence
    updatedHypothesis.confidence = this.calculateHypothesisConfidence(
      updatedHypothesis.supportingEvidence,
      updatedHypothesis.contradictingEvidence
    );

    updatedHypothesis.likelihood = this.estimateLikelihood(
      updatedHypothesis.supportingEvidence.length,
      updatedHypothesis.contradictingEvidence.length
    );

    updatedHypothesis.impact = this.assessImpact(
      updatedHypothesis.confidence,
      updatedHypothesis.likelihood
    );

    return {
      supports,
      strength,
      updatedHypothesis
    };
  }

  /**
   * Determine if evidence supports hypothesis
   */
  private doesEvidenceSupport(hypothesis: Hypothesis, evidence: Evidence): boolean {
    // This is a simplified implementation
    // In practice, this would use more sophisticated logic
    // based on the hypothesis description and evidence type

    // For now, use evidence strength as indicator
    return evidence.strength >= 0.6;
  }

  /**
   * Generate hypothesis from evidence
   */
  generateHypothesesFromEvidence(
    evidence: Evidence[],
    targetEntity: string
  ): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    // Group evidence by type
    const byType = new Map<string, Evidence[]>();

    for (const e of evidence) {
      const group = byType.get(e.type) || [];
      group.push(e);
      byType.set(e.type, group);
    }

    // Generate hypotheses based on evidence patterns
    for (const [type, group] of byType) {
      if (group.length >= 2) {
        const evidenceIds = group.map(e => e.id);

        const hypothesis = this.createHypothesis(
          `Attribution based on ${type} evidence`,
          evidenceIds,
          []
        );

        hypotheses.push(hypothesis);
      }
    }

    // Generate combined hypothesis if multiple types
    if (byType.size >= 2) {
      const allEvidenceIds = evidence.map(e => e.id);

      const combined = this.createHypothesis(
        `Multi-source attribution for ${targetEntity}`,
        allEvidenceIds,
        []
      );

      hypotheses.push(combined);
    }

    return hypotheses;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `hyp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
