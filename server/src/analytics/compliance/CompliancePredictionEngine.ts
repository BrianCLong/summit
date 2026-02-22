/**
 * Compliance Prediction Engine
 *
 * ML-powered compliance prediction and audit outcome forecasting.
 * Predicts compliance risks, audit readiness, and certification outcomes.
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC4.1 (Monitoring)
 *
 * @module analytics/compliance/CompliancePredictionEngine
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../../types/data-envelope.ts';
import logger from '../../utils/logger.ts';

// ============================================================================
// Types
// ============================================================================

export type ComplianceFramework =
  | 'SOC2'
  | 'ISO27001'
  | 'GDPR'
  | 'HIPAA'
  | 'PCI-DSS'
  | 'NIST'
  | 'FedRAMP'
  | 'NIST-CSF'
  | 'CMMC';

export type PredictionConfidence = 'high' | 'medium' | 'low';
export type AuditOutcome = 'pass' | 'pass_with_findings' | 'fail';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceState {
  tenantId: string;
  framework: ComplianceFramework;
  controlStates: ControlState[];
  evidenceMetrics: EvidenceMetrics;
  historicalAudits: HistoricalAudit[];
  currentGaps: ComplianceGap[];
  lastAssessmentDate: Date;
}

export interface ControlState {
  controlId: string;
  controlName: string;
  category: string;
  status: 'implemented' | 'partial' | 'not_implemented' | 'not_applicable';
  evidenceCount: number;
  evidenceQuality: number; // 0-100
  lastReviewDate: Date;
  exceptions: number;
  remediationInProgress: boolean;
}

export interface EvidenceMetrics {
  totalEvidence: number;
  averageQuality: number;
  staleEvidenceCount: number;
  automatedEvidencePercentage: number;
  coveragePercentage: number;
}

export interface HistoricalAudit {
  auditId: string;
  framework: ComplianceFramework;
  date: Date;
  outcome: AuditOutcome;
  findingsCount: number;
  criticalFindings: number;
  remediationDays: number;
  auditorNotes?: string;
}

export interface ComplianceGap {
  id: string;
  controlId: string;
  controlName: string;
  gapDescription: string;
  severity: RiskLevel;
  detectedAt: Date;
  daysOpen: number;
  remediationStatus: 'not_started' | 'in_progress' | 'blocked' | 'resolved';
}

export interface AuditPrediction {
  id: string;
  tenantId: string;
  framework: ComplianceFramework;
  predictedAt: string;
  predictionHorizon: string; // e.g., "30 days", "90 days"
  predictedOutcome: AuditOutcome;
  confidence: PredictionConfidence;
  confidenceScore: number; // 0-1
  passLikelihood: number; // 0-1
  riskScore: number; // 0-100
  keyRiskFactors: RiskFactor[];
  controlAtRisk: ControlRisk[];
  recommendedActions: RecommendedAction[];
  modelVersion: string;
  governanceVerdict: GovernanceVerdict;
}

export interface RiskFactor {
  category: string;
  description: string;
  impact: RiskLevel;
  likelihood: number; // 0-1
  mitigationAvailable: boolean;
}

export interface ControlRisk {
  controlId: string;
  controlName: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  primaryConcerns: string[];
  suggestedRemediations: string[];
}

export interface RecommendedAction {
  priority: number;
  action: string;
  description: string;
  estimatedEffort: 'minimal' | 'moderate' | 'significant';
  estimatedImpact: number; // Expected risk reduction 0-100
  deadline?: string;
}

export interface ComplianceTrend {
  tenantId: string;
  framework: ComplianceFramework;
  period: { start: Date; end: Date };
  dataPoints: TrendDataPoint[];
  overallTrend: 'improving' | 'stable' | 'declining';
  projectedScore: number;
  projectedDate: Date;
}

export interface TrendDataPoint {
  date: Date;
  complianceScore: number;
  controlsCompliant: number;
  controlsTotal: number;
  gapsOpen: number;
  evidenceQuality: number;
}

export interface PredictionEngineConfig {
  /** Model version to use */
  modelVersion: string;
  /** Minimum confidence for predictions */
  minConfidence: number;
  /** Historical data weight (0-1) */
  historicalWeight: number;
  /** Current state weight (0-1) */
  currentStateWeight: number;
  /** Industry benchmark adjustment */
  useBenchmarks: boolean;
  /** Prediction horizon in days */
  defaultHorizonDays: number;
}

export interface PredictionStats {
  totalPredictions: number;
  byFramework: Record<string, number>;
  byOutcome: Record<AuditOutcome, number>;
  averageConfidence: number;
  accuracyRate: number;
  lastPredictionAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'compliance-prediction-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'CompliancePredictionEngine',
  };
}

function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function calculateConfidence(score: number): PredictionConfidence {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PredictionEngineConfig = {
  modelVersion: '1.0.0',
  minConfidence: 0.6,
  historicalWeight: 0.3,
  currentStateWeight: 0.7,
  useBenchmarks: true,
  defaultHorizonDays: 30,
};

// ============================================================================
// Feature Extractor
// ============================================================================

class ComplianceFeatureExtractor {
  /**
   * Extract features from compliance state for prediction
   */
  extractFeatures(state: ComplianceState): number[] {
    const features: number[] = [];

    // Control state features
    const implemented = state.controlStates.filter(c => c.status === 'implemented').length;
    const partial = state.controlStates.filter(c => c.status === 'partial').length;
    const notImplemented = state.controlStates.filter(c => c.status === 'not_implemented').length;
    const total = state.controlStates.length || 1;

    features.push(implemented / total); // Implementation rate
    features.push(partial / total); // Partial implementation rate
    features.push(notImplemented / total); // Non-implementation rate

    // Evidence quality features
    const avgQuality = state.controlStates.reduce((sum, c) => sum + c.evidenceQuality, 0) / total;
    features.push(avgQuality / 100); // Normalized evidence quality

    features.push(state.evidenceMetrics.automatedEvidencePercentage / 100);
    features.push(state.evidenceMetrics.coveragePercentage / 100);
    features.push(Math.min(1, state.evidenceMetrics.staleEvidenceCount / 10)); // Normalized stale count

    // Gap features
    const criticalGaps = state.currentGaps.filter(g => g.severity === 'critical').length;
    const highGaps = state.currentGaps.filter(g => g.severity === 'high').length;
    features.push(Math.min(1, criticalGaps / 5)); // Normalized critical gaps
    features.push(Math.min(1, highGaps / 10)); // Normalized high gaps

    // Historical audit features
    if (state.historicalAudits.length > 0) {
      const lastAudit = state.historicalAudits[state.historicalAudits.length - 1];
      features.push(lastAudit.outcome === 'pass' ? 1 : lastAudit.outcome === 'pass_with_findings' ? 0.5 : 0);
      features.push(Math.min(1, lastAudit.findingsCount / 20)); // Normalized findings
      features.push(Math.min(1, lastAudit.criticalFindings / 5)); // Normalized critical
    } else {
      features.push(0.5, 0.5, 0.5); // No history - neutral values
    }

    // Time-based features
    const daysSinceAssessment = Math.floor(
      (Date.now() - state.lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    features.push(Math.min(1, daysSinceAssessment / 90)); // Normalized days since assessment

    return features;
  }

  /**
   * Extract control-level features
   */
  extractControlFeatures(control: ControlState): number[] {
    return [
      control.status === 'implemented' ? 1 : control.status === 'partial' ? 0.5 : 0,
      control.evidenceQuality / 100,
      Math.min(1, control.evidenceCount / 10),
      control.exceptions > 0 ? 0.5 : 1,
      control.remediationInProgress ? 0.7 : 1,
      Math.min(1, (Date.now() - control.lastReviewDate.getTime()) / (90 * 24 * 60 * 60 * 1000)),
    ];
  }
}

// ============================================================================
// Prediction Model (Simplified ML)
// ============================================================================

class CompliancePredictionModel {
  private weights: number[];
  private bias: number;
  private version: string;

  constructor(version: string) {
    this.version = version;
    // Pre-trained weights (in production, load from model file)
    this.weights = [
      0.3,   // Implementation rate
      0.15,  // Partial rate
      -0.4,  // Non-implementation rate
      0.25,  // Evidence quality
      0.15,  // Automated evidence
      0.2,   // Coverage
      -0.15, // Stale evidence
      -0.35, // Critical gaps
      -0.25, // High gaps
      0.2,   // Last audit outcome
      -0.15, // Findings count
      -0.25, // Critical findings
      -0.1,  // Days since assessment
    ];
    this.bias = 0.65; // Base pass probability
  }

  /**
   * Predict audit outcome
   */
  predict(features: number[]): { passLikelihood: number; confidence: number } {
    // Simple linear model (in production, use neural network or XGBoost)
    let score = this.bias;
    for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
      score += features[i] * this.weights[i];
    }

    // Sigmoid activation
    const passLikelihood = 1 / (1 + Math.exp(-score * 3));

    // Calculate confidence based on feature quality
    const featureVariance = features.reduce((sum, f) => sum + Math.pow(f - 0.5, 2), 0) / features.length;
    const confidence = Math.min(0.95, 0.5 + featureVariance);

    return { passLikelihood, confidence };
  }

  /**
   * Predict control risk
   */
  predictControlRisk(features: number[]): number {
    // Invert features for risk (lower values = higher risk)
    let riskScore = 0;
    riskScore += (1 - features[0]) * 40; // Status
    riskScore += (1 - features[1]) * 30; // Evidence quality
    riskScore += (1 - features[2]) * 15; // Evidence count
    riskScore += (1 - features[3]) * 10; // Exceptions
    riskScore += features[5] * 5; // Days since review

    return Math.min(100, Math.max(0, riskScore));
  }

  getVersion(): string {
    return this.version;
  }
}

// ============================================================================
// Risk Analyzer
// ============================================================================

class ComplianceRiskAnalyzer {
  /**
   * Analyze risk factors from compliance state
   */
  analyzeRisks(state: ComplianceState): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Control coverage risks
    const notImplemented = state.controlStates.filter(c => c.status === 'not_implemented');
    if (notImplemented.length > 0) {
      risks.push({
        category: 'Control Coverage',
        description: `${notImplemented.length} control(s) not implemented`,
        impact: notImplemented.length > 5 ? 'critical' : 'high',
        likelihood: 0.9,
        mitigationAvailable: true,
      });
    }

    // Evidence quality risks
    const lowQualityEvidence = state.controlStates.filter(c => c.evidenceQuality < 50);
    if (lowQualityEvidence.length > 0) {
      risks.push({
        category: 'Evidence Quality',
        description: `${lowQualityEvidence.length} control(s) have low evidence quality`,
        impact: 'high',
        likelihood: 0.7,
        mitigationAvailable: true,
      });
    }

    // Stale evidence risks
    if (state.evidenceMetrics.staleEvidenceCount > 5) {
      risks.push({
        category: 'Evidence Freshness',
        description: `${state.evidenceMetrics.staleEvidenceCount} pieces of stale evidence`,
        impact: 'medium',
        likelihood: 0.8,
        mitigationAvailable: true,
      });
    }

    // Gap-related risks
    const criticalGaps = state.currentGaps.filter(g => g.severity === 'critical');
    if (criticalGaps.length > 0) {
      risks.push({
        category: 'Open Gaps',
        description: `${criticalGaps.length} critical gap(s) remain unresolved`,
        impact: 'critical',
        likelihood: 0.95,
        mitigationAvailable: criticalGaps.some(g => g.remediationStatus === 'in_progress'),
      });
    }

    // Historical audit risks
    if (state.historicalAudits.length > 0) {
      const lastAudit = state.historicalAudits[state.historicalAudits.length - 1];
      if (lastAudit.outcome === 'fail') {
        risks.push({
          category: 'Audit History',
          description: 'Previous audit resulted in failure',
          impact: 'high',
          likelihood: 0.6,
          mitigationAvailable: true,
        });
      }
    }

    // Automation coverage risks
    if (state.evidenceMetrics.automatedEvidencePercentage < 30) {
      risks.push({
        category: 'Automation',
        description: 'Low automation coverage increases manual effort and error risk',
        impact: 'medium',
        likelihood: 0.5,
        mitigationAvailable: true,
      });
    }

    return risks;
  }

  /**
   * Analyze control-level risks
   */
  analyzeControlRisks(
    state: ComplianceState,
    model: CompliancePredictionModel,
    featureExtractor: ComplianceFeatureExtractor
  ): ControlRisk[] {
    const controlRisks: ControlRisk[] = [];

    for (const control of state.controlStates) {
      const features = featureExtractor.extractControlFeatures(control);
      const riskScore = model.predictControlRisk(features);

      if (riskScore >= 30) { // Only report significant risks
        const concerns: string[] = [];
        const remediations: string[] = [];

        if (control.status !== 'implemented') {
          concerns.push(`Control status: ${control.status}`);
          remediations.push('Complete control implementation');
        }
        if (control.evidenceQuality < 70) {
          concerns.push(`Low evidence quality (${control.evidenceQuality}%)`);
          remediations.push('Improve evidence documentation');
        }
        if (control.exceptions > 0) {
          concerns.push(`${control.exceptions} active exception(s)`);
          remediations.push('Review and address exceptions');
        }

        controlRisks.push({
          controlId: control.controlId,
          controlName: control.controlName,
          riskScore,
          riskLevel: calculateRiskLevel(riskScore),
          primaryConcerns: concerns,
          suggestedRemediations: remediations,
        });
      }
    }

    // Sort by risk score descending
    return controlRisks.sort((a, b) => b.riskScore - a.riskScore);
  }
}

// ============================================================================
// Recommendation Generator
// ============================================================================

class RecommendationGenerator {
  /**
   * Generate recommended actions based on risks
   */
  generate(
    risks: RiskFactor[],
    controlRisks: ControlRisk[],
    state: ComplianceState
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    let priority = 1;

    // Address critical gaps first
    const criticalGaps = state.currentGaps.filter(g => g.severity === 'critical');
    for (const gap of criticalGaps) {
      actions.push({
        priority: priority++,
        action: `Remediate critical gap: ${gap.controlName}`,
        description: gap.gapDescription,
        estimatedEffort: 'significant',
        estimatedImpact: 30,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Address high-risk controls
    const highRiskControls = controlRisks.filter(c => c.riskLevel === 'critical' || c.riskLevel === 'high');
    for (const control of highRiskControls.slice(0, 5)) {
      actions.push({
        priority: priority++,
        action: `Address risk in ${control.controlName}`,
        description: control.primaryConcerns.join('; '),
        estimatedEffort: 'moderate',
        estimatedImpact: Math.min(25, control.riskScore / 3),
      });
    }

    // Improve evidence quality
    if (state.evidenceMetrics.averageQuality < 70) {
      actions.push({
        priority: priority++,
        action: 'Improve evidence quality',
        description: 'Review and enhance documentation for controls with low evidence scores',
        estimatedEffort: 'moderate',
        estimatedImpact: 15,
      });
    }

    // Increase automation
    if (state.evidenceMetrics.automatedEvidencePercentage < 50) {
      actions.push({
        priority: priority++,
        action: 'Increase evidence automation',
        description: 'Implement automated evidence collection for routine controls',
        estimatedEffort: 'significant',
        estimatedImpact: 20,
      });
    }

    // Address stale evidence
    if (state.evidenceMetrics.staleEvidenceCount > 3) {
      actions.push({
        priority: priority++,
        action: 'Refresh stale evidence',
        description: `Update ${state.evidenceMetrics.staleEvidenceCount} stale evidence items`,
        estimatedEffort: 'minimal',
        estimatedImpact: 10,
      });
    }

    return actions;
  }
}

// ============================================================================
// Compliance Prediction Engine
// ============================================================================

export class CompliancePredictionEngine extends EventEmitter {
  private config: PredictionEngineConfig;
  private model: CompliancePredictionModel;
  private featureExtractor: ComplianceFeatureExtractor;
  private riskAnalyzer: ComplianceRiskAnalyzer;
  private recommendationGenerator: RecommendationGenerator;
  private predictions: Map<string, AuditPrediction[]> = new Map();
  private stats: PredictionStats;

  constructor(config?: Partial<PredictionEngineConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.model = new CompliancePredictionModel(this.config.modelVersion);
    this.featureExtractor = new ComplianceFeatureExtractor();
    this.riskAnalyzer = new ComplianceRiskAnalyzer();
    this.recommendationGenerator = new RecommendationGenerator();
    this.stats = {
      totalPredictions: 0,
      byFramework: {},
      byOutcome: {
        pass: 0,
        pass_with_findings: 0,
        fail: 0,
      },
      averageConfidence: 0,
      accuracyRate: 0,
      lastPredictionAt: null,
    };

    logger.info({ config: this.config }, 'CompliancePredictionEngine initialized');
  }

  /**
   * Predict audit outcome for a compliance state
   */
  async predictAuditOutcome(
    state: ComplianceState,
    horizonDays?: number
  ): Promise<DataEnvelope<AuditPrediction>> {
    const horizon = horizonDays || this.config.defaultHorizonDays;

    // Extract features
    const features = this.featureExtractor.extractFeatures(state);

    // Get model prediction
    const { passLikelihood, confidence } = this.model.predict(features);

    // Analyze risks
    const riskFactors = this.riskAnalyzer.analyzeRisks(state);
    const controlRisks = this.riskAnalyzer.analyzeControlRisks(
      state,
      this.model,
      this.featureExtractor
    );

    // Determine predicted outcome
    let predictedOutcome: AuditOutcome;
    if (passLikelihood >= 0.8) {
      predictedOutcome = 'pass';
    } else if (passLikelihood >= 0.5) {
      predictedOutcome = 'pass_with_findings';
    } else {
      predictedOutcome = 'fail';
    }

    // Calculate risk score
    const riskScore = Math.round((1 - passLikelihood) * 100);

    // Generate recommendations
    const recommendedActions = this.recommendationGenerator.generate(
      riskFactors,
      controlRisks,
      state
    );

    const prediction: AuditPrediction = {
      id: uuidv4(),
      tenantId: state.tenantId,
      framework: state.framework,
      predictedAt: new Date().toISOString(),
      predictionHorizon: `${horizon} days`,
      predictedOutcome,
      confidence: calculateConfidence(confidence),
      confidenceScore: confidence,
      passLikelihood,
      riskScore,
      keyRiskFactors: riskFactors,
      controlAtRisk: controlRisks.slice(0, 10), // Top 10
      recommendedActions,
      modelVersion: this.model.getVersion(),
      governanceVerdict: createVerdict(
        predictedOutcome === 'fail' ? GovernanceResult.FLAG :
        predictedOutcome === 'pass_with_findings' ? GovernanceResult.REVIEW_REQUIRED :
        GovernanceResult.ALLOW,
        `Audit prediction: ${predictedOutcome} (${(passLikelihood * 100).toFixed(1)}% likelihood)`
      ),
    };

    // Store prediction
    const tenantPredictions = this.predictions.get(state.tenantId) || [];
    tenantPredictions.push(prediction);
    this.predictions.set(state.tenantId, tenantPredictions.slice(-100));

    // Update stats
    this.updateStats(prediction);

    // Emit event for high-risk predictions
    if (predictedOutcome === 'fail') {
      this.emit('prediction:high-risk', prediction);
    }

    logger.info(
      {
        predictionId: prediction.id,
        tenantId: state.tenantId,
        framework: state.framework,
        predictedOutcome,
        passLikelihood,
        riskScore,
      },
      'Audit prediction generated'
    );

    return createDataEnvelope(prediction, {
      source: 'CompliancePredictionEngine',
      governanceVerdict: prediction.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Analyze compliance trends
   */
  async analyzeTrends(
    tenantId: string,
    framework: ComplianceFramework,
    historicalStates: ComplianceState[]
  ): Promise<DataEnvelope<ComplianceTrend>> {
    if (historicalStates.length === 0) {
      return createDataEnvelope({
        tenantId,
        framework,
        period: { start: new Date(), end: new Date() },
        dataPoints: [],
        overallTrend: 'stable',
        projectedScore: 0,
        projectedDate: new Date(),
      } as ComplianceTrend, {
        source: 'CompliancePredictionEngine',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'No historical data'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Sort by assessment date
    const sorted = [...historicalStates].sort(
      (a, b) => a.lastAssessmentDate.getTime() - b.lastAssessmentDate.getTime()
    );

    // Generate data points
    const dataPoints: TrendDataPoint[] = sorted.map(state => {
      const implemented = state.controlStates.filter(c => c.status === 'implemented').length;
      const total = state.controlStates.length || 1;

      return {
        date: state.lastAssessmentDate,
        complianceScore: (implemented / total) * 100,
        controlsCompliant: implemented,
        controlsTotal: total,
        gapsOpen: state.currentGaps.length,
        evidenceQuality: state.evidenceMetrics.averageQuality,
      };
    });

    // Calculate trend
    const firstScore = dataPoints[0].complianceScore;
    const lastScore = dataPoints[dataPoints.length - 1].complianceScore;
    const scoreDiff = lastScore - firstScore;

    let overallTrend: 'improving' | 'stable' | 'declining';
    if (scoreDiff > 5) {
      overallTrend = 'improving';
    } else if (scoreDiff < -5) {
      overallTrend = 'declining';
    } else {
      overallTrend = 'stable';
    }

    // Simple linear projection
    const avgChange = dataPoints.length > 1
      ? scoreDiff / (dataPoints.length - 1)
      : 0;
    const projectedScore = Math.min(100, Math.max(0, lastScore + avgChange * 3));
    const projectedDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    const trend: ComplianceTrend = {
      tenantId,
      framework,
      period: {
        start: sorted[0].lastAssessmentDate,
        end: sorted[sorted.length - 1].lastAssessmentDate,
      },
      dataPoints,
      overallTrend,
      projectedScore,
      projectedDate,
    };

    return createDataEnvelope(trend, {
      source: 'CompliancePredictionEngine',
      governanceVerdict: createVerdict(
        overallTrend === 'declining' ? GovernanceResult.FLAG : GovernanceResult.ALLOW,
        `Compliance trend: ${overallTrend}`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get predictions for a tenant
   */
  getPredictions(
    tenantId: string,
    framework?: ComplianceFramework
  ): DataEnvelope<AuditPrediction[]> {
    let predictions = this.predictions.get(tenantId) || [];

    if (framework) {
      predictions = predictions.filter(p => p.framework === framework);
    }

    return createDataEnvelope(predictions, {
      source: 'CompliancePredictionEngine',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Predictions retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get prediction statistics
   */
  getStats(): DataEnvelope<PredictionStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'CompliancePredictionEngine',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Record actual audit outcome for accuracy tracking
   */
  recordActualOutcome(
    tenantId: string,
    predictionId: string,
    actualOutcome: AuditOutcome
  ): void {
    const predictions = this.predictions.get(tenantId) || [];
    const prediction = predictions.find(p => p.id === predictionId);

    if (prediction) {
      const wasCorrect = prediction.predictedOutcome === actualOutcome;

      // Update accuracy rate
      const totalWithOutcome = this.stats.totalPredictions;
      const currentAccuracy = this.stats.accuracyRate;
      this.stats.accuracyRate =
        ((currentAccuracy * totalWithOutcome) + (wasCorrect ? 1 : 0)) / (totalWithOutcome + 1);

      logger.info(
        {
          predictionId,
          tenantId,
          predictedOutcome: prediction.predictedOutcome,
          actualOutcome,
          wasCorrect,
          newAccuracyRate: this.stats.accuracyRate,
        },
        'Actual audit outcome recorded'
      );
    }
  }

  /**
   * Clear tenant data
   */
  clearTenant(tenantId: string): void {
    this.predictions.delete(tenantId);
    logger.info({ tenantId }, 'Tenant data cleared from prediction engine');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private updateStats(prediction: AuditPrediction): void {
    this.stats.totalPredictions++;
    this.stats.byFramework[prediction.framework] =
      (this.stats.byFramework[prediction.framework] || 0) + 1;
    this.stats.byOutcome[prediction.predictedOutcome]++;
    this.stats.lastPredictionAt = prediction.predictedAt;

    // Update average confidence
    const n = this.stats.totalPredictions;
    this.stats.averageConfidence =
      ((this.stats.averageConfidence * (n - 1)) + prediction.confidenceScore) / n;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: CompliancePredictionEngine | null = null;

export function getCompliancePredictionEngine(
  config?: Partial<PredictionEngineConfig>
): CompliancePredictionEngine {
  if (!instance) {
    instance = new CompliancePredictionEngine(config);
  }
  return instance;
}

export default CompliancePredictionEngine;
