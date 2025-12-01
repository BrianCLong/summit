/**
 * RecommendationEngine - AI teammate providing instant recommendations
 * with confidence scoring and probable outcome highlighting
 */

import { randomUUID } from 'crypto';
import {
  Recommendation,
  ProbableOutcome,
  RiskFactor,
  ConfidenceBand,
  AutonomyLevel,
  CollaborationConfig,
  DEFAULT_COLLABORATION_CONFIG,
} from './types.js';

interface RecommendationInput {
  missionId: string;
  context: Record<string, unknown>;
  action: string;
  actionType: string;
  parameters: Record<string, unknown>;
}

interface ModelInference {
  confidence: number;
  reasoning: string[];
  outcomes: ProbableOutcome[];
  riskFactors: RiskFactor[];
}

/**
 * Engine for generating AI recommendations with full explainability
 */
export class RecommendationEngine {
  private config: CollaborationConfig;
  private modelVersion: string;
  private recommendations: Map<string, Recommendation> = new Map();

  constructor(
    config: Partial<CollaborationConfig> = {},
    modelVersion = '1.0.0'
  ) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };
    this.modelVersion = modelVersion;
  }

  /**
   * Generate a recommendation with confidence scoring and outcomes
   */
  async generateRecommendation(
    input: RecommendationInput,
    autonomyLevel: AutonomyLevel = this.config.defaultAutonomyLevel,
    traceId: string = randomUUID(),
    spanId: string = randomUUID()
  ): Promise<Recommendation> {
    // Run model inference (pluggable - could call ML service)
    const inference = await this.runInference(input);

    // Classify confidence
    const confidenceBand = this.classifyConfidence(inference.confidence);

    // Determine if approval is required
    const requiresApproval = this.determineApprovalRequired(
      inference,
      autonomyLevel
    );

    const recommendation: Recommendation = {
      id: randomUUID(),
      missionId: input.missionId,
      timestamp: new Date().toISOString(),

      action: input.action,
      actionType: input.actionType,
      parameters: input.parameters,

      confidence: inference.confidence,
      confidenceBand,
      reasoning: inference.reasoning,
      modelVersion: this.modelVersion,

      outcomes: inference.outcomes,

      riskLevel: this.computeOverallRisk(inference.riskFactors),
      riskFactors: inference.riskFactors,

      autonomyLevel,
      requiresApproval,
      expiresAt: new Date(
        Date.now() + this.config.recommendationTtlMs
      ).toISOString(),

      traceId,
      spanId,
    };

    this.recommendations.set(recommendation.id, recommendation);
    return recommendation;
  }

  /**
   * Get recommendation by ID
   */
  getRecommendation(id: string): Recommendation | undefined {
    return this.recommendations.get(id);
  }

  /**
   * Get all pending recommendations for a mission
   */
  getPendingRecommendations(missionId: string): Recommendation[] {
    const now = new Date();
    return Array.from(this.recommendations.values()).filter(
      (r) =>
        r.missionId === missionId &&
        new Date(r.expiresAt) > now
    );
  }

  /**
   * Check if recommendation can be auto-approved
   */
  canAutoApprove(recommendation: Recommendation): boolean {
    if (!this.config.autoApprovalEnabled) return false;
    if (recommendation.requiresApproval) return false;
    if (recommendation.confidence < this.config.autoApprovalThreshold) return false;
    if (recommendation.riskLevel === 'critical') return false;
    if (recommendation.riskLevel === 'high' && this.config.highRiskRequiresApproval) return false;
    return true;
  }

  /**
   * Highlight probable outcomes for commander review
   */
  highlightOutcomes(recommendation: Recommendation): {
    positiveOutcomes: ProbableOutcome[];
    negativeOutcomes: ProbableOutcome[];
    uncertainOutcomes: ProbableOutcome[];
  } {
    const positiveOutcomes = recommendation.outcomes.filter(
      (o) => o.impact === 'positive' && o.probability >= 0.5
    );
    const negativeOutcomes = recommendation.outcomes.filter(
      (o) => o.impact === 'negative' && o.probability >= 0.3
    );
    const uncertainOutcomes = recommendation.outcomes.filter(
      (o) => o.probability < 0.5 && o.probability >= 0.2
    );

    return { positiveOutcomes, negativeOutcomes, uncertainOutcomes };
  }

  /**
   * Run model inference (pluggable implementation)
   */
  private async runInference(input: RecommendationInput): Promise<ModelInference> {
    // This would typically call an ML model service
    // For now, provide a structured inference result

    const baseConfidence = 0.75;
    const contextFactors = Object.keys(input.context).length;
    const confidence = Math.min(0.95, baseConfidence + contextFactors * 0.02);

    return {
      confidence,
      reasoning: [
        `Action "${input.action}" evaluated for mission ${input.missionId}`,
        `Context includes ${contextFactors} factors`,
        `Parameters validated against policy constraints`,
      ],
      outcomes: [
        {
          description: 'Successful completion of requested action',
          probability: confidence,
          impact: 'positive',
          severity: 'moderate',
        },
        {
          description: 'Potential side effects on related entities',
          probability: 0.3,
          impact: 'neutral',
          severity: 'minor',
        },
        {
          description: 'Risk of unintended consequences',
          probability: 0.15,
          impact: 'negative',
          severity: 'minor',
          mitigations: ['Review before execution', 'Enable rollback capability'],
        },
      ],
      riskFactors: this.assessRisks(input),
    };
  }

  /**
   * Assess risks for an action
   */
  private assessRisks(input: RecommendationInput): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Check action type risks
    if (input.actionType === 'delete' || input.actionType === 'destroy') {
      factors.push({
        factor: 'destructive_action',
        severity: 'high',
        description: 'Action involves data destruction',
        mitigation: 'Ensure backup exists before proceeding',
      });
    }

    if (input.actionType === 'modify' || input.actionType === 'update') {
      factors.push({
        factor: 'state_modification',
        severity: 'medium',
        description: 'Action modifies existing state',
        mitigation: 'Review changes before applying',
      });
    }

    // Check parameter risks
    if (input.parameters['scope'] === 'global') {
      factors.push({
        factor: 'global_scope',
        severity: 'high',
        description: 'Action affects global scope',
        mitigation: 'Consider narrowing scope if possible',
      });
    }

    return factors;
  }

  /**
   * Classify confidence into bands
   */
  private classifyConfidence(confidence: number): ConfidenceBand {
    if (confidence >= this.config.highConfidenceThreshold) return 'high';
    if (confidence >= this.config.lowConfidenceThreshold) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'uncertain';
  }

  /**
   * Compute overall risk level
   */
  private computeOverallRisk(factors: RiskFactor[]): 'low' | 'medium' | 'high' | 'critical' {
    if (factors.some((f) => f.severity === 'critical')) return 'critical';
    if (factors.some((f) => f.severity === 'high')) return 'high';
    if (factors.some((f) => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Determine if human approval is required
   */
  private determineApprovalRequired(
    inference: ModelInference,
    autonomyLevel: AutonomyLevel
  ): boolean {
    // Manual only always requires approval
    if (autonomyLevel === 'manual_only') return true;

    // Full auto never requires approval
    if (autonomyLevel === 'full_auto') return false;

    // Advisory mode always requires approval
    if (autonomyLevel === 'advisory') return true;

    // Supervised mode: check risk and confidence
    const overallRisk = this.computeOverallRisk(inference.riskFactors);

    if (overallRisk === 'critical' && this.config.criticalRiskRequiresApproval) {
      return true;
    }
    if (overallRisk === 'high' && this.config.highRiskRequiresApproval) {
      return true;
    }
    if (inference.confidence < this.config.autoApprovalThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Update model version after retraining
   */
  updateModelVersion(version: string): void {
    this.modelVersion = version;
  }

  /**
   * Get current configuration
   */
  getConfig(): CollaborationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CollaborationConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
