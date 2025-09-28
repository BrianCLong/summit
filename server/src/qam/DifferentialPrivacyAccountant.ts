import { EventEmitter } from 'events';
import { logger } from '../config/logger';

export interface DPAccountantConfig {
  epsilonBudget: number;
  deltaBudget: number;
  compositionMethod: CompositionMethod;
  accountingMethod: AccountingMethod;
  autoRenewal: boolean;
  renewalPeriod: number; // in milliseconds
  alertThresholds: AlertThresholds;
  privacyDegradationTracking: boolean;
}

export interface AlertThresholds {
  epsilonWarning: number; // percentage of budget
  epsilonCritical: number;
  deltaWarning: number;
  deltaCritical: number;
  degradationThreshold: number;
}

export enum CompositionMethod {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  RDP = 'rdp', // Rényi Differential Privacy
  GDP = 'gdp', // Gaussian Differential Privacy
  CONCENTRATED = 'concentrated',
  MOMENTS = 'moments'
}

export enum AccountingMethod {
  EPSILON_DELTA = 'epsilon_delta',
  MOMENTS_ACCOUNTANT = 'moments_accountant',
  RDP_ACCOUNTANT = 'rdp_accountant',
  PRIVACY_LOSS_DISTRIBUTION = 'privacy_loss_distribution'
}

export interface PrivacyQuery {
  id: string;
  timestamp: Date;
  queryType: QueryType;
  epsilon: number;
  delta: number;
  sensitivity: number;
  mechanism: PrivacyMechanism;
  parameters: QueryParameters;
  metadata: QueryMetadata;
}

export enum QueryType {
  COUNT = 'count',
  SUM = 'sum',
  MEAN = 'mean',
  VARIANCE = 'variance',
  HISTOGRAM = 'histogram',
  QUANTILE = 'quantile',
  COVARIANCE = 'covariance',
  CUSTOM = 'custom'
}

export enum PrivacyMechanism {
  LAPLACE = 'laplace',
  GAUSSIAN = 'gaussian',
  EXPONENTIAL = 'exponential',
  SPARSE_VECTOR = 'sparse_vector',
  ABOVE_THRESHOLD = 'above_threshold',
  SMOOTH_SENSITIVITY = 'smooth_sensitivity',
  PROPOSE_TEST_RELEASE = 'propose_test_release'
}

export interface QueryParameters {
  datasetSize: number;
  clippingBound?: number;
  samplingProbability?: number;
  noiseMultiplier?: number;
  iterations?: number;
  batchSize?: number;
  learningRate?: number;
  customParams?: Record<string, any>;
}

export interface QueryMetadata {
  tenantId: string;
  appId: string;
  workloadId?: string;
  purpose: string;
  dataClassification: DataClassification;
  retentionPeriod: number;
  deletionDate?: Date;
}

export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  SECRET = 'secret'
}

export interface PrivacyBudget {
  totalEpsilon: number;
  totalDelta: number;
  remainingEpsilon: number;
  remainingDelta: number;
  utilizationPercent: number;
  lastRenewal: Date;
  nextRenewal?: Date;
  isExhausted: boolean;
}

export interface CompositionResult {
  composedEpsilon: number;
  composedDelta: number;
  method: CompositionMethod;
  confidence: number;
  tightness: number;
  queries: PrivacyQuery[];
}

export interface PrivacyLoss {
  queryId: string;
  epsilon: number;
  delta: number;
  timestamp: Date;
  cumulativeEpsilon: number;
  cumulativeDelta: number;
  mechanism: PrivacyMechanism;
  degradationScore: number;
}

export interface PrivacyAuditReport {
  periodStart: Date;
  periodEnd: Date;
  totalQueries: number;
  epsilonConsumed: number;
  deltaConsumed: number;
  budgetUtilization: number;
  privacyViolations: PrivacyViolation[];
  compositionAnalysis: CompositionAnalysis;
  recommendations: PrivacyRecommendation[];
}

export interface PrivacyViolation {
  id: string;
  timestamp: Date;
  violationType: ViolationType;
  severity: ViolationSeverity;
  description: string;
  affectedQueries: string[];
  mitigation: string;
  resolved: boolean;
}

export enum ViolationType {
  BUDGET_EXCEEDED = 'budget_exceeded',
  INVALID_PARAMETERS = 'invalid_parameters',
  COMPOSITION_ERROR = 'composition_error',
  SENSITIVITY_VIOLATION = 'sensitivity_violation',
  MECHANISM_MISUSE = 'mechanism_misuse',
  DATA_LEAK = 'data_leak'
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface CompositionAnalysis {
  totalQueries: number;
  dominantMechanism: PrivacyMechanism;
  tightestBound: number;
  loosestBound: number;
  averageBoundTightness: number;
  compositionEfficiency: number;
}

export interface PrivacyRecommendation {
  id: string;
  type: RecommendationType;
  priority: Priority;
  title: string;
  description: string;
  expectedBenefit: string;
  implementation: string;
  estimatedSavings: BudgetSavings;
}

export enum RecommendationType {
  BUDGET_OPTIMIZATION = 'budget_optimization',
  MECHANISM_UPGRADE = 'mechanism_upgrade',
  COMPOSITION_IMPROVEMENT = 'composition_improvement',
  PARAMETER_TUNING = 'parameter_tuning',
  QUERY_BATCHING = 'query_batching',
  SENSITIVITY_REDUCTION = 'sensitivity_reduction'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface BudgetSavings {
  epsilonSavings: number;
  deltaSavings: number;
  percentageImprovement: number;
}

export interface MomentsAccountantState {
  orders: number[];
  logMoments: number[];
  composedEpsilon: number;
  composedDelta: number;
  lastUpdate: Date;
}

export interface RDPAccountantState {
  alphaValues: number[];
  rdpValues: number[];
  composedEpsilon: number;
  composedDelta: number;
  lastUpdate: Date;
}

export class DifferentialPrivacyAccountant extends EventEmitter {
  private config: DPAccountantConfig;
  private budget: PrivacyBudget;
  private queries: PrivacyQuery[] = [];
  private violations: PrivacyViolation[] = [];
  private momentsState?: MomentsAccountantState;
  private rdpState?: RDPAccountantState;
  private renewalTimer?: NodeJS.Timeout;
  private auditTimer?: NodeJS.Timeout;

  constructor(config: DPAccountantConfig) {
    super();
    this.config = config;

    this.budget = {
      totalEpsilon: config.epsilonBudget,
      totalDelta: config.deltaBudget,
      remainingEpsilon: config.epsilonBudget,
      remainingDelta: config.deltaBudget,
      utilizationPercent: 0,
      lastRenewal: new Date(),
      nextRenewal: config.autoRenewal ? new Date(Date.now() + config.renewalPeriod) : undefined,
      isExhausted: false
    };

    this.initializeAccountingMethod();
    this.startPeriodicRenewal();
    this.startPeriodicAuditing();

    logger.info('DifferentialPrivacyAccountant initialized', {
      epsilonBudget: config.epsilonBudget,
      deltaBudget: config.deltaBudget,
      compositionMethod: config.compositionMethod,
      accountingMethod: config.accountingMethod
    });
  }

  private initializeAccountingMethod(): void {
    switch (this.config.accountingMethod) {
      case AccountingMethod.MOMENTS_ACCOUNTANT:
        this.momentsState = {
          orders: [1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 64, 256],
          logMoments: [],
          composedEpsilon: 0,
          composedDelta: 0,
          lastUpdate: new Date()
        };
        this.momentsState.logMoments = new Array(this.momentsState.orders.length).fill(0);
        break;

      case AccountingMethod.RDP_ACCOUNTANT:
        this.rdpState = {
          alphaValues: [1.01, 1.02, 1.03, 1.04, 1.05, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 16, 32, 64],
          rdpValues: [],
          composedEpsilon: 0,
          composedDelta: 0,
          lastUpdate: new Date()
        };
        this.rdpState.rdpValues = new Array(this.rdpState.alphaValues.length).fill(0);
        break;
    }
  }

  public async checkBudget(
    requestedEpsilon: number,
    requestedDelta: number
  ): Promise<{ allowed: boolean; reason?: string; suggestion?: string }> {
    try {
      // Check if request would exceed budget
      if (this.budget.remainingEpsilon < requestedEpsilon) {
        return {
          allowed: false,
          reason: `Insufficient epsilon budget. Requested: ${requestedEpsilon}, Available: ${this.budget.remainingEpsilon}`,
          suggestion: `Consider reducing epsilon to ${this.budget.remainingEpsilon} or wait for budget renewal`
        };
      }

      if (this.budget.remainingDelta < requestedDelta) {
        return {
          allowed: false,
          reason: `Insufficient delta budget. Requested: ${requestedDelta}, Available: ${this.budget.remainingDelta}`,
          suggestion: `Consider reducing delta to ${this.budget.remainingDelta} or wait for budget renewal`
        };
      }

      // Check if this would trigger alerts
      const projectedEpsilonUtilization =
        ((this.budget.totalEpsilon - this.budget.remainingEpsilon + requestedEpsilon) / this.budget.totalEpsilon) * 100;

      const projectedDeltaUtilization =
        ((this.budget.totalDelta - this.budget.remainingDelta + requestedDelta) / this.budget.totalDelta) * 100;

      let suggestion: string | undefined;

      if (projectedEpsilonUtilization >= this.config.alertThresholds.epsilonCritical) {
        suggestion = 'Warning: This query will push epsilon utilization into critical range';
      } else if (projectedEpsilonUtilization >= this.config.alertThresholds.epsilonWarning) {
        suggestion = 'Notice: This query will push epsilon utilization above warning threshold';
      }

      if (projectedDeltaUtilization >= this.config.alertThresholds.deltaCritical) {
        suggestion = 'Warning: This query will push delta utilization into critical range';
      }

      return { allowed: true, suggestion };

    } catch (error) {
      logger.error('Budget check failed', { error: error.message });
      return {
        allowed: false,
        reason: 'Budget check system error',
        suggestion: 'Contact system administrator'
      };
    }
  }

  public async consumeBudget(query: PrivacyQuery): Promise<PrivacyLoss> {
    const startTime = Date.now();

    try {
      // Validate query
      await this.validateQuery(query);

      // Check budget availability
      const budgetCheck = await this.checkBudget(query.epsilon, query.delta);
      if (!budgetCheck.allowed) {
        throw new Error(`Budget insufficient: ${budgetCheck.reason}`);
      }

      // Calculate actual privacy loss using composition
      const actualLoss = await this.calculatePrivacyLoss(query);

      // Update budget
      this.budget.remainingEpsilon -= actualLoss.epsilon;
      this.budget.remainingDelta -= actualLoss.delta;
      this.budget.utilizationPercent =
        ((this.budget.totalEpsilon - this.budget.remainingEpsilon) / this.budget.totalEpsilon) * 100;

      // Check if budget is exhausted
      this.budget.isExhausted =
        this.budget.remainingEpsilon <= 0 || this.budget.remainingDelta <= 0;

      // Store query
      this.queries.push(query);

      // Update accounting state
      await this.updateAccountingState(query, actualLoss);

      // Check for alerts
      await this.checkAlerts();

      // Create privacy loss record
      const privacyLoss: PrivacyLoss = {
        queryId: query.id,
        epsilon: actualLoss.epsilon,
        delta: actualLoss.delta,
        timestamp: new Date(),
        cumulativeEpsilon: this.budget.totalEpsilon - this.budget.remainingEpsilon,
        cumulativeDelta: this.budget.totalDelta - this.budget.remainingDelta,
        mechanism: query.mechanism,
        degradationScore: await this.calculateDegradationScore(query)
      };

      this.emit('budgetConsumed', {
        queryId: query.id,
        epsilon: actualLoss.epsilon,
        delta: actualLoss.delta,
        remainingEpsilon: this.budget.remainingEpsilon,
        remainingDelta: this.budget.remainingDelta,
        duration: Date.now() - startTime
      });

      logger.info('Privacy budget consumed', {
        queryId: query.id,
        epsilon: actualLoss.epsilon,
        delta: actualLoss.delta,
        remainingEpsilon: this.budget.remainingEpsilon.toFixed(6),
        utilizationPercent: this.budget.utilizationPercent.toFixed(2)
      });

      return privacyLoss;

    } catch (error) {
      logger.error('Budget consumption failed', {
        queryId: query.id,
        error: error.message
      });
      throw error;
    }
  }

  private async validateQuery(query: PrivacyQuery): Promise<void> {
    if (query.epsilon <= 0) {
      throw new Error('Epsilon must be positive');
    }

    if (query.delta < 0 || query.delta >= 1) {
      throw new Error('Delta must be in [0, 1)');
    }

    if (query.sensitivity <= 0) {
      throw new Error('Sensitivity must be positive');
    }

    // Validate mechanism parameters
    switch (query.mechanism) {
      case PrivacyMechanism.GAUSSIAN:
        if (!query.parameters.noiseMultiplier || query.parameters.noiseMultiplier <= 0) {
          throw new Error('Gaussian mechanism requires positive noise multiplier');
        }
        break;

      case PrivacyMechanism.LAPLACE:
        // Laplace mechanism validation
        break;

      default:
        // Additional validations for other mechanisms
        break;
    }
  }

  private async calculatePrivacyLoss(query: PrivacyQuery): Promise<{ epsilon: number; delta: number }> {
    switch (this.config.compositionMethod) {
      case CompositionMethod.BASIC:
        return this.calculateBasicComposition(query);

      case CompositionMethod.ADVANCED:
        return this.calculateAdvancedComposition(query);

      case CompositionMethod.MOMENTS:
        return this.calculateMomentsComposition(query);

      case CompositionMethod.RDP:
        return this.calculateRDPComposition(query);

      default:
        return { epsilon: query.epsilon, delta: query.delta };
    }
  }

  private calculateBasicComposition(query: PrivacyQuery): { epsilon: number; delta: number } {
    // Basic composition: just return the query's privacy parameters
    return { epsilon: query.epsilon, delta: query.delta };
  }

  private calculateAdvancedComposition(query: PrivacyQuery): { epsilon: number; delta: number } {
    // Advanced composition theorem
    const k = this.queries.length + 1; // Number of queries including this one
    const epsilon = query.epsilon;
    const delta = query.delta;

    // Advanced composition bound
    const epsilonComposed = Math.sqrt(2 * k * Math.log(1 / delta)) * epsilon + k * epsilon * (Math.exp(epsilon) - 1);
    const deltaComposed = k * delta;

    return {
      epsilon: Math.min(epsilon, epsilonComposed),
      delta: Math.min(delta, deltaComposed)
    };
  }

  private calculateMomentsComposition(query: PrivacyQuery): { epsilon: number; delta: number } {
    if (!this.momentsState) {
      throw new Error('Moments accountant not initialized');
    }

    // Simplified moments accountant calculation
    // In practice, this would involve more complex moment calculations
    const sigma = query.parameters.noiseMultiplier || 1.0;
    const q = query.parameters.samplingProbability || 1.0;

    // Calculate log moments for this query
    const queryLogMoments = this.momentsState.orders.map(order => {
      // Simplified calculation - would use actual moment generating function
      const logMoment = Math.log(1 + q * (Math.exp(order * query.epsilon) - 1));
      return logMoment;
    });

    // Update cumulative moments
    for (let i = 0; i < this.momentsState.logMoments.length; i++) {
      this.momentsState.logMoments[i] += queryLogMoments[i];
    }

    // Convert to (ε, δ) using optimal order
    const bestEpsilon = this.findOptimalEpsilon(this.config.deltaBudget);

    return {
      epsilon: Math.min(query.epsilon, bestEpsilon),
      delta: query.delta
    };
  }

  private findOptimalEpsilon(targetDelta: number): number {
    if (!this.momentsState) return 0;

    let bestEpsilon = Infinity;

    for (let i = 0; i < this.momentsState.orders.length; i++) {
      const order = this.momentsState.orders[i];
      const logMoment = this.momentsState.logMoments[i];

      // Calculate epsilon for this order
      const epsilon = (logMoment - Math.log(targetDelta)) / (order - 1);

      if (epsilon < bestEpsilon && epsilon > 0) {
        bestEpsilon = epsilon;
      }
    }

    return bestEpsilon === Infinity ? 0 : bestEpsilon;
  }

  private calculateRDPComposition(query: PrivacyQuery): { epsilon: number; delta: number } {
    if (!this.rdpState) {
      throw new Error('RDP accountant not initialized');
    }

    // Simplified RDP calculation
    const sigma = query.parameters.noiseMultiplier || 1.0;
    const q = query.parameters.samplingProbability || 1.0;

    // Calculate RDP for this query
    const queryRDP = this.rdpState.alphaValues.map(alpha => {
      // Simplified RDP calculation for Gaussian mechanism
      const rdp = q * alpha / (2 * sigma * sigma);
      return rdp;
    });

    // Update cumulative RDP
    for (let i = 0; i < this.rdpState.rdpValues.length; i++) {
      this.rdpState.rdpValues[i] += queryRDP[i];
    }

    // Convert RDP to (ε, δ)
    const bestEpsilon = this.convertRDPToEpsilonDelta(this.config.deltaBudget);

    return {
      epsilon: Math.min(query.epsilon, bestEpsilon),
      delta: query.delta
    };
  }

  private convertRDPToEpsilonDelta(targetDelta: number): number {
    if (!this.rdpState) return 0;

    let bestEpsilon = Infinity;

    for (let i = 0; i < this.rdpState.alphaValues.length; i++) {
      const alpha = this.rdpState.alphaValues[i];
      const rdp = this.rdpState.rdpValues[i];

      // Convert RDP to (ε, δ)
      const epsilon = rdp + Math.log(1 / targetDelta) / (alpha - 1);

      if (epsilon < bestEpsilon && epsilon > 0) {
        bestEpsilon = epsilon;
      }
    }

    return bestEpsilon === Infinity ? 0 : bestEpsilon;
  }

  private async updateAccountingState(query: PrivacyQuery, actualLoss: { epsilon: number; delta: number }): Promise<void> {
    switch (this.config.accountingMethod) {
      case AccountingMethod.MOMENTS_ACCOUNTANT:
        if (this.momentsState) {
          this.momentsState.composedEpsilon += actualLoss.epsilon;
          this.momentsState.composedDelta += actualLoss.delta;
          this.momentsState.lastUpdate = new Date();
        }
        break;

      case AccountingMethod.RDP_ACCOUNTANT:
        if (this.rdpState) {
          this.rdpState.composedEpsilon += actualLoss.epsilon;
          this.rdpState.composedDelta += actualLoss.delta;
          this.rdpState.lastUpdate = new Date();
        }
        break;
    }
  }

  private async calculateDegradationScore(query: PrivacyQuery): Promise<number> {
    if (!this.config.privacyDegradationTracking) return 0;

    // Calculate how much this query degrades overall privacy
    const epsilonRatio = query.epsilon / this.budget.totalEpsilon;
    const deltaRatio = query.delta / this.budget.totalDelta;

    // Consider mechanism efficiency
    const mechanismEfficiency = this.getMechanismEfficiency(query.mechanism);

    // Consider query frequency and patterns
    const frequencyPenalty = this.calculateFrequencyPenalty(query);

    const degradationScore = (epsilonRatio + deltaRatio) * (1 - mechanismEfficiency) * (1 + frequencyPenalty);

    return Math.min(1.0, degradationScore);
  }

  private getMechanismEfficiency(mechanism: PrivacyMechanism): number {
    // Return efficiency scores for different mechanisms
    switch (mechanism) {
      case PrivacyMechanism.GAUSSIAN: return 0.9;
      case PrivacyMechanism.LAPLACE: return 0.8;
      case PrivacyMechanism.EXPONENTIAL: return 0.85;
      case PrivacyMechanism.SPARSE_VECTOR: return 0.95;
      case PrivacyMechanism.ABOVE_THRESHOLD: return 0.92;
      case PrivacyMechanism.SMOOTH_SENSITIVITY: return 0.88;
      default: return 0.7;
    }
  }

  private calculateFrequencyPenalty(query: PrivacyQuery): number {
    // Count similar queries in recent history
    const recentQueries = this.queries.filter(q =>
      Date.now() - q.timestamp.getTime() < 3600000 && // Last hour
      q.queryType === query.queryType &&
      q.tenantId === query.metadata.tenantId
    );

    // Apply penalty for frequent similar queries
    return Math.min(0.5, recentQueries.length * 0.1);
  }

  private async checkAlerts(): Promise<void> {
    const utilizationPercent = this.budget.utilizationPercent;

    // Epsilon alerts
    if (utilizationPercent >= this.config.alertThresholds.epsilonCritical) {
      await this.generateAlert('EPSILON_CRITICAL',
        `Epsilon budget utilization at ${utilizationPercent.toFixed(1)}%`);
    } else if (utilizationPercent >= this.config.alertThresholds.epsilonWarning) {
      await this.generateAlert('EPSILON_WARNING',
        `Epsilon budget utilization at ${utilizationPercent.toFixed(1)}%`);
    }

    // Delta alerts
    const deltaUtilization = ((this.budget.totalDelta - this.budget.remainingDelta) / this.budget.totalDelta) * 100;
    if (deltaUtilization >= this.config.alertThresholds.deltaCritical) {
      await this.generateAlert('DELTA_CRITICAL',
        `Delta budget utilization at ${deltaUtilization.toFixed(1)}%`);
    } else if (deltaUtilization >= this.config.alertThresholds.deltaWarning) {
      await this.generateAlert('DELTA_WARNING',
        `Delta budget utilization at ${deltaUtilization.toFixed(1)}%`);
    }

    // Budget exhaustion
    if (this.budget.isExhausted) {
      await this.generateAlert('BUDGET_EXHAUSTED', 'Privacy budget has been exhausted');
    }
  }

  private async generateAlert(alertType: string, message: string): Promise<void> {
    this.emit('privacyAlert', {
      type: alertType,
      message,
      timestamp: new Date(),
      budgetStatus: { ...this.budget }
    });

    logger.warn('Privacy budget alert', { alertType, message });
  }

  public async renewBudget(): Promise<void> {
    try {
      const oldBudget = { ...this.budget };

      // Reset budget
      this.budget.remainingEpsilon = this.config.epsilonBudget;
      this.budget.remainingDelta = this.config.deltaBudget;
      this.budget.utilizationPercent = 0;
      this.budget.lastRenewal = new Date();
      this.budget.nextRenewal = this.config.autoRenewal ?
        new Date(Date.now() + this.config.renewalPeriod) : undefined;
      this.budget.isExhausted = false;

      // Archive old queries
      const archivedQueries = [...this.queries];
      this.queries = [];

      // Reset accounting state
      this.initializeAccountingMethod();

      this.emit('budgetRenewed', {
        oldBudget,
        newBudget: { ...this.budget },
        archivedQueries: archivedQueries.length
      });

      logger.info('Privacy budget renewed', {
        epsilonBudget: this.budget.totalEpsilon,
        deltaBudget: this.budget.totalDelta,
        archivedQueries: archivedQueries.length
      });

    } catch (error) {
      logger.error('Budget renewal failed', { error: error.message });
      throw error;
    }
  }

  public getBudgetStatus(): PrivacyBudget {
    return { ...this.budget };
  }

  public getQueries(limit?: number): PrivacyQuery[] {
    return limit ? this.queries.slice(-limit) : [...this.queries];
  }

  public async generateAuditReport(
    startDate: Date,
    endDate: Date
  ): Promise<PrivacyAuditReport> {
    try {
      const periodQueries = this.queries.filter(q =>
        q.timestamp >= startDate && q.timestamp <= endDate
      );

      const epsilonConsumed = periodQueries.reduce((sum, q) => sum + q.epsilon, 0);
      const deltaConsumed = periodQueries.reduce((sum, q) => sum + q.delta, 0);

      const budgetUtilization = this.budget.utilizationPercent;

      const compositionAnalysis = this.analyzeComposition(periodQueries);
      const recommendations = await this.generateRecommendations(periodQueries);

      const report: PrivacyAuditReport = {
        periodStart: startDate,
        periodEnd: endDate,
        totalQueries: periodQueries.length,
        epsilonConsumed,
        deltaConsumed,
        budgetUtilization,
        privacyViolations: [...this.violations],
        compositionAnalysis,
        recommendations
      };

      this.emit('auditReportGenerated', {
        reportPeriod: [startDate, endDate],
        totalQueries: periodQueries.length,
        budgetUtilization
      });

      return report;

    } catch (error) {
      logger.error('Audit report generation failed', { error: error.message });
      throw error;
    }
  }

  private analyzeComposition(queries: PrivacyQuery[]): CompositionAnalysis {
    if (queries.length === 0) {
      return {
        totalQueries: 0,
        dominantMechanism: PrivacyMechanism.LAPLACE,
        tightestBound: 0,
        loosestBound: 0,
        averageBoundTightness: 0,
        compositionEfficiency: 0
      };
    }

    // Find dominant mechanism
    const mechanismCounts = new Map<PrivacyMechanism, number>();
    queries.forEach(q => {
      mechanismCounts.set(q.mechanism, (mechanismCounts.get(q.mechanism) || 0) + 1);
    });

    const dominantMechanism = Array.from(mechanismCounts.entries())
      .reduce((max, current) => current[1] > max[1] ? current : max)[0];

    // Calculate bound statistics
    const epsilonValues = queries.map(q => q.epsilon);
    const tightestBound = Math.min(...epsilonValues);
    const loosestBound = Math.max(...epsilonValues);
    const averageBoundTightness = epsilonValues.reduce((sum, eps) => sum + eps, 0) / queries.length;

    // Calculate composition efficiency
    const basicCompositionCost = queries.reduce((sum, q) => sum + q.epsilon, 0);
    const advancedCompositionCost = this.calculateAdvancedCompositionCost(queries);
    const compositionEfficiency = advancedCompositionCost / basicCompositionCost;

    return {
      totalQueries: queries.length,
      dominantMechanism,
      tightestBound,
      loosestBound,
      averageBoundTightness,
      compositionEfficiency
    };
  }

  private calculateAdvancedCompositionCost(queries: PrivacyQuery[]): number {
    // Simplified advanced composition calculation
    const k = queries.length;
    const avgEpsilon = queries.reduce((sum, q) => sum + q.epsilon, 0) / k;
    const avgDelta = queries.reduce((sum, q) => sum + q.delta, 0) / k;

    return Math.sqrt(2 * k * Math.log(1 / avgDelta)) * avgEpsilon + k * avgEpsilon * (Math.exp(avgEpsilon) - 1);
  }

  private async generateRecommendations(queries: PrivacyQuery[]): Promise<PrivacyRecommendation[]> {
    const recommendations: PrivacyRecommendation[] = [];

    // Budget optimization recommendation
    if (this.budget.utilizationPercent > 80) {
      recommendations.push({
        id: `rec_budget_${Date.now()}`,
        type: RecommendationType.BUDGET_OPTIMIZATION,
        priority: Priority.HIGH,
        title: 'Optimize Budget Usage',
        description: 'High budget utilization detected. Consider implementing more efficient mechanisms.',
        expectedBenefit: 'Reduce privacy budget consumption by 20-30%',
        implementation: 'Switch to advanced composition or more efficient mechanisms',
        estimatedSavings: {
          epsilonSavings: this.budget.totalEpsilon * 0.25,
          deltaSavings: this.budget.totalDelta * 0.15,
          percentageImprovement: 25
        }
      });
    }

    // Mechanism upgrade recommendation
    const inefficientQueries = queries.filter(q =>
      this.getMechanismEfficiency(q.mechanism) < 0.8
    );

    if (inefficientQueries.length > queries.length * 0.3) {
      recommendations.push({
        id: `rec_mechanism_${Date.now()}`,
        type: RecommendationType.MECHANISM_UPGRADE,
        priority: Priority.MEDIUM,
        title: 'Upgrade Privacy Mechanisms',
        description: 'Many queries use inefficient mechanisms. Consider upgrading to more efficient alternatives.',
        expectedBenefit: 'Improve mechanism efficiency and reduce privacy cost',
        implementation: 'Replace Laplace with Gaussian mechanism where appropriate',
        estimatedSavings: {
          epsilonSavings: inefficientQueries.length * 0.1,
          deltaSavings: 0,
          percentageImprovement: 15
        }
      });
    }

    return recommendations;
  }

  private startPeriodicRenewal(): void {
    if (this.config.autoRenewal) {
      this.renewalTimer = setInterval(() => {
        this.renewBudget().catch(error => {
          logger.error('Automatic budget renewal failed', { error: error.message });
        });
      }, this.config.renewalPeriod);
    }
  }

  private startPeriodicAuditing(): void {
    // Run audit every hour
    const auditInterval = 3600000; // 1 hour
    this.auditTimer = setInterval(() => {
      this.performPeriodicAudit().catch(error => {
        logger.error('Periodic audit failed', { error: error.message });
      });
    }, auditInterval);
  }

  private async performPeriodicAudit(): Promise<void> {
    try {
      // Generate hourly audit
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 3600000); // 1 hour ago

      const report = await this.generateAuditReport(startDate, endDate);

      this.emit('periodicAuditCompleted', {
        report,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Periodic audit failed', { error: error.message });
    }
  }

  public async shutdown(): Promise<void> {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
    }

    if (this.auditTimer) {
      clearInterval(this.auditTimer);
    }

    this.removeAllListeners();

    logger.info('DifferentialPrivacyAccountant shutdown complete', {
      totalQueries: this.queries.length,
      budgetUtilization: this.budget.utilizationPercent.toFixed(2)
    });
  }
}