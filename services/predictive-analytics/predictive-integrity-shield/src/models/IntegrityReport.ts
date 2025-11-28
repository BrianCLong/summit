/**
 * Integrity Report Model
 * Comprehensive report of model integrity status
 */

export enum IntegrityStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  FAILED = 'FAILED',
}

export interface IntegrityReport {
  id: string;
  timestamp: Date;
  modelId: string;
  modelVersion?: string;
  reliabilityScore: number;
  status: IntegrityStatus;

  // Detailed metrics
  driftMetrics: DriftMetric;
  adversarialSignals: AdversarialSignal;
  biasIndicators: BiasIndicator;
  performanceMetrics: PerformanceMetric;

  // Actions and recommendations
  healingActions: HealingAction[];
  recommendations: string[];
  alerts: IntegrityAlert[];

  // Metadata
  checksPerformed: string[];
  processingTime: number;
  dataQuality: number;
}

export interface DriftMetric {
  dataDrift: number;
  conceptDrift: number;
  predictionDrift: number;
  psi: number;
  ksStatistic: number;
  jsDivergence: number;
  severity: DriftSeverity;
  affectedFeatures: FeatureDrift[];
  driftDetected: boolean;
  driftTrend: string;
  driftVelocity: number;
  estimatedImpact: string;
}

export enum DriftSeverity {
  NONE = 'NONE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface FeatureDrift {
  featureName: string;
  psi: number;
  ksStatistic: number;
  severity: DriftSeverity;
  baselineStats: FeatureStats;
  currentStats: FeatureStats;
}

export interface FeatureStats {
  mean?: number;
  median?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  percentile25?: number;
  percentile75?: number;
  missingRate?: number;
  uniqueCount?: number;
  distribution?: number[];
}

export interface AdversarialSignal {
  adversarialScore: number;
  isAdversarial: boolean;
  confidence: number;
  isolationForestScore?: number;
  lofScore?: number;
  reconstructionError?: number;
  anomalyCount: number;
  anomalyRate: number;
  suspiciousInputs: SuspiciousInput[];
  validationPassed: boolean;
  validationErrors: string[];
}

export interface SuspiciousInput {
  inputId: string;
  timestamp: Date;
  anomalyScore: number;
  detectionMethod: string;
  features: Record<string, any>;
  explanation: string;
}

export interface BiasIndicator {
  demographicParity: number;
  equalOpportunity: number;
  equalizedOdds: number;
  calibrationError: number;
  disparateImpact: number;
  severity: BiasSeverity;
  biasDetected: boolean;
  affectedGroups: GroupBias[];
  protectedAttributes: string[];
  mitigationStrategies: string[];
}

export enum BiasSeverity {
  NONE = 'NONE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  SEVERE = 'SEVERE',
}

export interface GroupBias {
  groupName: string;
  protectedAttribute: string;
  groupValue: string;
  selectionRate: number;
  truePositiveRate: number;
  falsePositiveRate: number;
  precision: number;
  recall: number;
  disparityRatio: number;
  isUnderrepresented: boolean;
}

export interface PerformanceMetric {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  performanceDrift: number;
  performanceTrend: string;
  degradationRate: number;
  vsBaseline: number;
  vsLastWeek: number;
  vsLastMonth: number;
}

export enum HealingActionType {
  RECALIBRATE = 'RECALIBRATE',
  FALLBACK_TO_ENSEMBLE = 'FALLBACK_TO_ENSEMBLE',
  TRIGGER_RETRAINING = 'TRIGGER_RETRAINING',
  ADJUST_THRESHOLDS = 'ADJUST_THRESHOLDS',
  BLOCK_PREDICTIONS = 'BLOCK_PREDICTIONS',
  ALERT_TEAM = 'ALERT_TEAM',
  AUTO_SCALE = 'AUTO_SCALE',
  RESET_BASELINE = 'RESET_BASELINE',
}

export enum ActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface HealingAction {
  id: string;
  timestamp: Date;
  actionType: HealingActionType;
  status: ActionStatus;
  trigger: string;
  severity: string;
  details: Record<string, any>;
  parameters?: Record<string, any>;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  success?: boolean;
  impact?: string;
  beforeScore?: number;
  afterScore?: number;
  improvements?: string[];
  error?: string;
  retryCount?: number;
}

export enum DetectorType {
  DRIFT = 'DRIFT',
  ADVERSARIAL = 'ADVERSARIAL',
  BIAS = 'BIAS',
  UNCERTAINTY = 'UNCERTAINTY',
  PERFORMANCE = 'PERFORMANCE',
}

export interface IntegrityAlert {
  id: string;
  timestamp: Date;
  severity: string;
  alertType: string;
  message: string;
  detectorType: DetectorType;
  modelId: string;
  affectedComponents: string[];
  metrics: Record<string, any>;
  recommendedActions: string[];
  autoRemediated: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class IntegrityReportBuilder {
  private report: Partial<IntegrityReport> = {};

  constructor(modelId: string) {
    this.report = {
      id: this.generateId(),
      timestamp: new Date(),
      modelId,
      healingActions: [],
      recommendations: [],
      alerts: [],
      checksPerformed: [],
      processingTime: 0,
      dataQuality: 1.0,
    };
  }

  withDriftMetrics(driftMetrics: DriftMetric): this {
    this.report.driftMetrics = driftMetrics;
    this.report.checksPerformed?.push('drift');
    return this;
  }

  withAdversarialSignals(adversarialSignals: AdversarialSignal): this {
    this.report.adversarialSignals = adversarialSignals;
    this.report.checksPerformed?.push('adversarial');
    return this;
  }

  withBiasIndicators(biasIndicators: BiasIndicator): this {
    this.report.biasIndicators = biasIndicators;
    this.report.checksPerformed?.push('bias');
    return this;
  }

  withPerformanceMetrics(performanceMetrics: PerformanceMetric): this {
    this.report.performanceMetrics = performanceMetrics;
    this.report.checksPerformed?.push('performance');
    return this;
  }

  addHealingAction(action: HealingAction): this {
    this.report.healingActions?.push(action);
    return this;
  }

  addRecommendation(recommendation: string): this {
    this.report.recommendations?.push(recommendation);
    return this;
  }

  addAlert(alert: IntegrityAlert): this {
    this.report.alerts?.push(alert);
    return this;
  }

  withReliabilityScore(score: number): this {
    this.report.reliabilityScore = score;
    return this;
  }

  withStatus(status: IntegrityStatus): this {
    this.report.status = status;
    return this;
  }

  withProcessingTime(time: number): this {
    this.report.processingTime = time;
    return this;
  }

  build(): IntegrityReport {
    // Calculate reliability score if not set
    if (this.report.reliabilityScore === undefined) {
      this.report.reliabilityScore = this.calculateReliabilityScore();
    }

    // Determine status if not set
    if (!this.report.status) {
      this.report.status = this.determineStatus();
    }

    return this.report as IntegrityReport;
  }

  private calculateReliabilityScore(): number {
    const weights = {
      drift: 0.3,
      adversarial: 0.3,
      bias: 0.2,
      performance: 0.2,
    };

    let score = 1.0;

    if (this.report.driftMetrics) {
      const driftScore = 1 - Math.min(this.report.driftMetrics.psi / 0.5, 1);
      score -= weights.drift * (1 - driftScore);
    }

    if (this.report.adversarialSignals) {
      score -= weights.adversarial * (1 - this.report.adversarialSignals.adversarialScore);
    }

    if (this.report.biasIndicators) {
      const biasScore = Math.min(
        this.report.biasIndicators.demographicParity,
        this.report.biasIndicators.equalOpportunity
      );
      score -= weights.bias * (1 - biasScore);
    }

    if (this.report.performanceMetrics) {
      const perfScore = 1 - Math.abs(this.report.performanceMetrics.performanceDrift);
      score -= weights.performance * (1 - perfScore);
    }

    return Math.max(0, Math.min(1, score));
  }

  private determineStatus(): IntegrityStatus {
    const score = this.report.reliabilityScore || 0;

    if (score >= 0.9) return IntegrityStatus.HEALTHY;
    if (score >= 0.7) return IntegrityStatus.DEGRADED;
    if (score >= 0.5) return IntegrityStatus.WARNING;
    if (score >= 0.3) return IntegrityStatus.CRITICAL;
    return IntegrityStatus.FAILED;
  }

  private generateId(): string {
    return `integrity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
