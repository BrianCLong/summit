/**
 * Trust Scoring Service
 *
 * Computes and manages trust scores for agents and predictive models.
 * Implements the Trust Model with:
 * - Non-authoritative advisory scores
 * - Transparent, explainable calculations
 * - Time-based decay
 * - Full audit trail
 *
 * SOC 2 Controls: CC7.2 (Monitoring), CC7.3 (Anomaly detection)
 *
 * @module agents/trust/TrustScoringService
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.ts';
import {
  TrustScoreRequest,
  TrustScoreResponse,
  TrustScoreBreakdown,
  TrustScoreWithUncertainty,
  TrustScoreComponents,
  AgentTrustComponents,
  ModelTrustComponents,
  ComponentWeights,
  AgentTrustWeights,
  ModelTrustWeights,
  DEFAULT_COMPONENT_WEIGHTS,
  DEFAULT_AGENT_TRUST_WEIGHTS,
  DEFAULT_MODEL_TRUST_WEIGHTS,
  HistoricalAccuracyData,
  ComplianceData,
  AuditData,
  ConsistencyData,
  DecayConfiguration,
  DEFAULT_DECAY_CONFIG,
  TrustScoreUpdateEvent,
  SubjectType,
  getTrustScoreBand,
  calculateStandardDeviation,
} from './types.ts';

// ============================================================================
// Configuration
// ============================================================================

export interface TrustScoringConfig {
  enableDecay: boolean;
  decayConfig: DecayConfiguration;
  componentWeights: ComponentWeights;
  agentWeights: AgentTrustWeights;
  modelWeights: ModelTrustWeights;
  cacheTTL: number; // Milliseconds
  minDataPoints: number; // Minimum data points for reliable score
}

const DEFAULT_CONFIG: TrustScoringConfig = {
  enableDecay: true,
  decayConfig: DEFAULT_DECAY_CONFIG,
  componentWeights: DEFAULT_COMPONENT_WEIGHTS,
  agentWeights: DEFAULT_AGENT_TRUST_WEIGHTS,
  modelWeights: DEFAULT_MODEL_TRUST_WEIGHTS,
  cacheTTL: 300000, // 5 minutes
  minDataPoints: 10,
};

// ============================================================================
// Trust Scoring Service
// ============================================================================

export class TrustScoringService extends EventEmitter {
  private config: TrustScoringConfig;
  private scoreCache: Map<string, { score: TrustScoreBreakdown; expiresAt: number }>;
  private updateEvents: TrustScoreUpdateEvent[];

  // Mock data stores (in real implementation, these would query actual audit logs)
  private historicalData: Map<string, HistoricalAccuracyData>;
  private complianceData: Map<string, ComplianceData>;
  private auditData: Map<string, AuditData>;
  private consistencyData: Map<string, ConsistencyData>;
  private lastActivityTime: Map<string, number>;

  constructor(config?: Partial<TrustScoringConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scoreCache = new Map();
    this.updateEvents = [];

    // Initialize mock data stores
    this.historicalData = new Map();
    this.complianceData = new Map();
    this.auditData = new Map();
    this.consistencyData = new Map();
    this.lastActivityTime = new Map();

    logger.info('[TrustScoringService] Initialized');
  }

  // ==========================================================================
  // Main Trust Score Calculation
  // ==========================================================================

  /**
   * Calculate trust score for an agent or model.
   */
  public async calculateTrustScore(request: TrustScoreRequest): Promise<TrustScoreResponse> {
    logger.info(`[TrustScoringService] Calculating trust score for ${request.subjectId}`, {
      subjectType: request.subjectType,
    });

    // Check cache
    const cached = this.checkCache(request.subjectId);
    if (cached) {
      logger.info(`[TrustScoringService] Cache hit for ${request.subjectId}`);
      return {
        subjectId: request.subjectId,
        subjectType: request.subjectType,
        score: cached,
        timestamp: new Date().toISOString(),
      };
    }

    // Gather historical data
    const historicalAccuracy = this.getHistoricalAccuracy(request.subjectId);
    const compliance = this.getComplianceData(request.subjectId);
    const audit = this.getAuditData(request.subjectId);
    const consistency = this.getConsistencyData(request.subjectId);

    // Calculate component scores
    const components = this.calculateComponents(
      historicalAccuracy,
      compliance,
      audit,
      consistency,
      request.subjectType
    );

    // Calculate overall score
    const weights =
      request.subjectType === 'agent' ? this.config.agentWeights : this.config.modelWeights;
    const overallScore = this.calculateOverallScore(components, weights);

    // Apply decay
    const decayFactor = this.config.enableDecay
      ? this.calculateDecayFactor(request.subjectId)
      : 1.0;
    const decayedScore = overallScore * decayFactor;

    // Build breakdown
    const breakdown: TrustScoreBreakdown = {
      overallScore: decayedScore,
      band: getTrustScoreBand(decayedScore),
      components: {
        historicalAccuracy: components.historicalAccuracy,
        constraintCompliance: components.constraintCompliance,
        auditOutcomes: components.auditOutcomes,
        consistency: components.consistency,
      },
      dataPoints: {
        totalPredictions: historicalAccuracy.totalPredictions,
        totalTasks: historicalAccuracy.totalTasks,
        violations: compliance.violations,
        audits: audit.totalAudits,
      },
      lastUpdated: new Date().toISOString(),
      decayFactor,
    };

    // Cache result
    this.cacheScore(request.subjectId, breakdown);

    // Build response
    let score: TrustScoreBreakdown | TrustScoreWithUncertainty = breakdown;
    if (request.includeUncertainty) {
      score = this.addUncertainty(breakdown, historicalAccuracy.totalPredictions || historicalAccuracy.totalTasks);
    }

    const explanation = request.includeExplanation
      ? this.generateExplanation(breakdown, request.subjectType)
      : undefined;

    return {
      subjectId: request.subjectId,
      subjectType: request.subjectType,
      score,
      explanation,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Component Calculation
  // ==========================================================================

  private calculateComponents(
    historical: HistoricalAccuracyData,
    compliance: ComplianceData,
    audit: AuditData,
    consistency: ConsistencyData,
    subjectType: SubjectType
  ): TrustScoreComponents | AgentTrustComponents | ModelTrustComponents {
    // Base components (common to all)
    const baseComponents: TrustScoreComponents = {
      historicalAccuracy: this.calculateHistoricalAccuracyScore(historical),
      constraintCompliance: this.calculateComplianceScore(compliance),
      auditOutcomes: this.calculateAuditScore(audit),
      consistency: this.calculateConsistencyScore(consistency),
    };

    if (subjectType === 'agent') {
      // Add agent-specific components
      return {
        ...baseComponents,
        capabilityAdherence: this.calculateCapabilityAdherence(compliance),
        negotiationBehavior: this.calculateNegotiationBehavior(),
        resourceDiscipline: this.calculateResourceDiscipline(compliance),
      } as AgentTrustComponents;
    } else {
      // Add model-specific components
      return {
        ...baseComponents,
        calibration: this.calculateCalibration(historical),
        biasMetrics: this.calculateBiasMetrics(),
        explainabilityQuality: this.calculateExplainabilityQuality(),
      } as ModelTrustComponents;
    }
  }

  // --------------------------------------------------------------------------
  // Historical Accuracy (40% weight)
  // --------------------------------------------------------------------------

  private calculateHistoricalAccuracyScore(data: HistoricalAccuracyData): number {
    if (data.totalPredictions === 0 && data.totalTasks === 0) {
      return 0.5; // Neutral score for new agents/models
    }

    // Weight recent accuracy more heavily
    const recentWeight = 0.7;
    const olderWeight = 0.3;

    const score = data.recentAccuracy * recentWeight + data.olderAccuracy * olderWeight;
    return Math.max(0, Math.min(1, score));
  }

  // --------------------------------------------------------------------------
  // Constraint Compliance (30% weight)
  // --------------------------------------------------------------------------

  private calculateComplianceScore(data: ComplianceData): number {
    if (data.totalPolicyChecks === 0) {
      return 0.5; // Neutral score for no activity
    }

    const baseScore = 1 - data.violations / data.totalPolicyChecks;

    // Penalize recent violations more heavily
    const recentPenalty = Math.min(0.5, data.recentViolations * 0.1);

    return Math.max(0, Math.min(1, baseScore - recentPenalty));
  }

  // --------------------------------------------------------------------------
  // Audit Outcomes (20% weight)
  // --------------------------------------------------------------------------

  private calculateAuditScore(data: AuditData): number {
    if (data.totalAudits === 0) {
      return 0.5; // Neutral score for no audits
    }

    const passRate = data.passedAudits / data.totalAudits;

    // Penalize findings
    const criticalPenalty = data.criticalFindings * 0.2;
    const mediumPenalty = data.mediumFindings * 0.1;

    return Math.max(0, Math.min(1, passRate - criticalPenalty - mediumPenalty));
  }

  // --------------------------------------------------------------------------
  // Consistency (10% weight)
  // --------------------------------------------------------------------------

  private calculateConsistencyScore(data: ConsistencyData): number {
    if (data.accuracyByWeek.length < 3) {
      return 0.5; // Not enough data
    }

    const stdDev = calculateStandardDeviation(data.accuracyByWeek);

    // High variance → low consistency
    if (stdDev > 0.3) return 0;

    const consistencyScore = 1 - stdDev / 0.3;
    return Math.max(0, Math.min(1, consistencyScore));
  }

  // --------------------------------------------------------------------------
  // Agent-Specific Components
  // --------------------------------------------------------------------------

  private calculateCapabilityAdherence(data: ComplianceData): number {
    if (data.totalPolicyChecks === 0) return 0.5;

    return 1 - data.unauthorizedAttempts / data.totalPolicyChecks;
  }

  private calculateNegotiationBehavior(): number {
    // Simplified: would analyze negotiation history
    return 0.85;
  }

  private calculateResourceDiscipline(data: ComplianceData): number {
    if (data.totalPolicyChecks === 0) return 0.5;

    return 1 - data.resourceBreaches / data.totalPolicyChecks;
  }

  // --------------------------------------------------------------------------
  // Model-Specific Components
  // --------------------------------------------------------------------------

  private calculateCalibration(data: HistoricalAccuracyData): number {
    // Simplified: would analyze predicted confidence vs. actual accuracy
    return 0.8;
  }

  private calculateBiasMetrics(): number {
    // Simplified: would analyze false positive/negative rates
    return 0.85;
  }

  private calculateExplainabilityQuality(): number {
    // Simplified: would analyze explanation correlation with outcomes
    return 0.75;
  }

  // ==========================================================================
  // Overall Score Calculation
  // ==========================================================================

  private calculateOverallScore(
    components: TrustScoreComponents | AgentTrustComponents | ModelTrustComponents,
    weights: ComponentWeights | AgentTrustWeights | ModelTrustWeights
  ): number {
    let score = 0;

    // Base components
    score += components.historicalAccuracy * weights.historicalAccuracy;
    score += components.constraintCompliance * weights.constraintCompliance;
    score += components.auditOutcomes * weights.auditOutcomes;
    score += components.consistency * weights.consistency;

    // Agent-specific
    if ('capabilityAdherence' in components && 'capabilityAdherence' in weights) {
      score += components.capabilityAdherence * weights.capabilityAdherence;
      score += components.negotiationBehavior * weights.negotiationBehavior;
      score += components.resourceDiscipline * weights.resourceDiscipline;
    }

    // Model-specific
    if ('calibration' in components && 'calibration' in weights) {
      score += components.calibration * weights.calibration;
      score += components.biasMetrics * weights.biasMetrics;
      score += components.explainabilityQuality * weights.explainabilityQuality;
    }

    return Math.max(0, Math.min(1, score));
  }

  // ==========================================================================
  // Decay Calculation
  // ==========================================================================

  private calculateDecayFactor(subjectId: string): number {
    const lastActivity = this.lastActivityTime.get(subjectId);
    if (!lastActivity) return 1.0; // No decay if no activity recorded

    const daysSinceActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);

    // Find applicable decay interval
    const intervals = this.config.decayConfig.intervals.sort(
      (a, b) => b.daysSinceActivity - a.daysSinceActivity
    );

    for (const interval of intervals) {
      if (daysSinceActivity >= interval.daysSinceActivity) {
        return interval.decayFactor;
      }
    }

    return 1.0; // No decay
  }

  // ==========================================================================
  // Uncertainty Calculation
  // ==========================================================================

  private addUncertainty(
    breakdown: TrustScoreBreakdown,
    sampleSize: number
  ): TrustScoreWithUncertainty {
    // Calculate 95% confidence interval using normal approximation
    const z = 1.96; // 95% CI
    const p = breakdown.overallScore;
    const n = Math.max(1, sampleSize);

    const standardError = Math.sqrt((p * (1 - p)) / n);
    const marginOfError = z * standardError;

    return {
      ...breakdown,
      confidenceInterval: {
        lower: Math.max(0, p - marginOfError),
        upper: Math.min(1, p + marginOfError),
      },
      sampleSize,
    };
  }

  // ==========================================================================
  // Explanation Generation
  // ==========================================================================

  private generateExplanation(breakdown: TrustScoreBreakdown, subjectType: SubjectType): string {
    const { overallScore, band, components, dataPoints } = breakdown;

    let explanation = `Trust score: ${overallScore.toFixed(2)} (${band.replace('_', ' ')}). `;

    if (subjectType === 'agent') {
      explanation += `This agent has completed ${dataPoints.totalTasks || 0} tasks `;
    } else {
      explanation += `This model has made ${dataPoints.totalPredictions || 0} predictions `;
    }

    const accuracyPercent = (components.historicalAccuracy * 100).toFixed(0);
    explanation += `with ${accuracyPercent}% accuracy, `;

    if (dataPoints.violations === 0) {
      explanation += 'zero policy violations, ';
    } else {
      explanation += `${dataPoints.violations} policy violation(s), `;
    }

    if (dataPoints.audits > 0) {
      explanation += `and passed ${dataPoints.audits} audit(s). `;
    }

    if (band === 'very_high' || band === 'high') {
      explanation += 'Recent performance is consistent with historical averages.';
    } else if (band === 'low' || band === 'very_low') {
      explanation += 'Recommend manual review before relying on outputs.';
    }

    return explanation;
  }

  // ==========================================================================
  // Data Management (Mock Implementations)
  // ==========================================================================

  private getHistoricalAccuracy(subjectId: string): HistoricalAccuracyData {
    return (
      this.historicalData.get(subjectId) || {
        totalPredictions: 0,
        correctPredictions: 0,
        totalTasks: 0,
        successfulTasks: 0,
        recentAccuracy: 0.5,
        olderAccuracy: 0.5,
      }
    );
  }

  private getComplianceData(subjectId: string): ComplianceData {
    return (
      this.complianceData.get(subjectId) || {
        totalPolicyChecks: 0,
        violations: 0,
        recentViolations: 0,
        resourceBreaches: 0,
        unauthorizedAttempts: 0,
      }
    );
  }

  private getAuditData(subjectId: string): AuditData {
    return (
      this.auditData.get(subjectId) || {
        totalAudits: 0,
        passedAudits: 0,
        criticalFindings: 0,
        mediumFindings: 0,
      }
    );
  }

  private getConsistencyData(subjectId: string): ConsistencyData {
    return (
      this.consistencyData.get(subjectId) || {
        accuracyByWeek: [],
        behavioralVariance: 0,
      }
    );
  }

  // ==========================================================================
  // Data Injection (For Testing/Demo)
  // ==========================================================================

  public injectHistoricalData(subjectId: string, data: HistoricalAccuracyData): void {
    this.historicalData.set(subjectId, data);
    this.lastActivityTime.set(subjectId, Date.now());
  }

  public injectComplianceData(subjectId: string, data: ComplianceData): void {
    this.complianceData.set(subjectId, data);
  }

  public injectAuditData(subjectId: string, data: AuditData): void {
    this.auditData.set(subjectId, data);
  }

  public injectConsistencyData(subjectId: string, data: ConsistencyData): void {
    this.consistencyData.set(subjectId, data);
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  private checkCache(subjectId: string): TrustScoreBreakdown | null {
    const cached = this.scoreCache.get(subjectId);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.scoreCache.delete(subjectId);
      return null;
    }

    return cached.score;
  }

  private cacheScore(subjectId: string, score: TrustScoreBreakdown): void {
    const expiresAt = Date.now() + this.config.cacheTTL;
    this.scoreCache.set(subjectId, { score, expiresAt });
  }

  public clearCache(): void {
    this.scoreCache.clear();
  }

  // ==========================================================================
  // Update Tracking
  // ==========================================================================

  public recordUpdate(event: TrustScoreUpdateEvent): void {
    this.updateEvents.push(event);
    this.emit('trust_score_updated', event);
    logger.info('[TrustScoringService] Trust score updated', event);
  }

  public getUpdateEvents(): TrustScoreUpdateEvent[] {
    return [...this.updateEvents];
  }

  public clearUpdateEvents(): void {
    this.updateEvents = [];
  }
}

// ============================================================================
// Factory
// ============================================================================

let serviceInstance: TrustScoringService | null = null;

export function getTrustScoringService(config?: Partial<TrustScoringConfig>): TrustScoringService {
  if (!serviceInstance) {
    serviceInstance = new TrustScoringService(config);
  }
  return serviceInstance;
}
