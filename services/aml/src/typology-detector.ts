/**
 * AML Typology Detection Engine
 * Sprint 28C: ML-driven detection of financial crime patterns and suspicious behavior
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface TransactionEvent {
  id: string;
  timestamp: Date;
  type: 'wire' | 'ach' | 'check' | 'card' | 'cash' | 'crypto' | 'correspondent';
  amount: number;
  currency: string;
  parties: {
    originator: {
      id: string;
      name: string;
      type: 'individual' | 'entity';
      account?: string;
      location?: string;
      jurisdiction?: string;
    };
    beneficiary: {
      id: string;
      name: string;
      type: 'individual' | 'entity';
      account?: string;
      location?: string;
      jurisdiction?: string;
    };
    intermediaries?: Array<{
      id: string;
      name: string;
      role: 'correspondent' | 'agent' | 'processor';
    }>;
  };
  metadata: {
    channel: string;
    reference: string;
    purpose?: string;
    narrative?: string;
    urgency?: 'normal' | 'urgent' | 'priority';
    structuring?: boolean;
  };
  riskIndicators: {
    highRiskJurisdiction: boolean;
    sanctionsHit: boolean;
    pepInvolved: boolean;
    cashIntensive: boolean;
    roundAmount: boolean;
    velocityAlert: boolean;
    patternAlert: boolean;
  };
}

export interface TypologyRule {
  id: string;
  name: string;
  category:
    | 'money_laundering'
    | 'terrorist_financing'
    | 'fraud'
    | 'sanctions_evasion'
    | 'trade_based'
    | 'cyber_crime';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  conditions: {
    temporal: {
      timeWindow: number; // milliseconds
      minOccurrences: number;
      maxOccurrences?: number;
    };
    behavioral: {
      patterns: Array<{
        type:
          | 'velocity'
          | 'amount'
          | 'geography'
          | 'timing'
          | 'party'
          | 'narrative';
        operator:
          | 'equals'
          | 'greater_than'
          | 'less_than'
          | 'between'
          | 'contains'
          | 'pattern_match';
        value: any;
        weight: number;
      }>;
      threshold: number;
    };
    network: {
      relationships: Array<{
        type:
          | 'same_party'
          | 'shared_account'
          | 'geographic_proximity'
          | 'temporal_clustering';
        strength: number;
      }>;
      minNodes: number;
      maxDegrees: number;
    };
  };
  actions: Array<{
    type: 'alert' | 'escalate' | 'block' | 'investigate' | 'file_sar';
    parameters: Record<string, any>;
  }>;
  enabled: boolean;
  statistics: {
    detections: number;
    truePositives: number;
    falsePositives: number;
    precision: number;
    recall: number;
    lastTriggered?: Date;
  };
}

export interface TypologyDetection {
  id: string;
  ruleId: string;
  timestamp: Date;
  confidence: number;
  severity: TypologyRule['severity'];
  transactions: string[];
  entities: string[];
  pattern: {
    type: string;
    description: string;
    timeline: Array<{
      timestamp: Date;
      event: string;
      significance: number;
    }>;
    evidence: Array<{
      type: 'statistical' | 'behavioral' | 'network' | 'contextual';
      description: string;
      strength: number;
      data: any;
    }>;
  };
  risk: {
    score: number;
    factors: Array<{
      factor: string;
      impact: number;
      explanation: string;
    }>;
    jurisdiction: string;
    regulatory: string[];
  };
  recommendation: {
    action: 'monitor' | 'investigate' | 'escalate' | 'file_sar' | 'block';
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeline: string;
    assignee?: string;
  };
  investigation?: {
    status:
      | 'open'
      | 'investigating'
      | 'escalated'
      | 'closed'
      | 'false_positive';
    analyst?: string;
    notes: Array<{
      timestamp: Date;
      author: string;
      content: string;
      classification: 'public' | 'confidential' | 'restricted';
    }>;
    decisions: Array<{
      timestamp: Date;
      decision: string;
      rationale: string;
      approver: string;
    }>;
  };
}

export interface BehavioralProfile {
  entityId: string;
  timeframe: { start: Date; end: Date };
  transactionSummary: {
    count: number;
    totalVolume: number;
    averageAmount: number;
    currencies: string[];
    channels: string[];
    jurisdictions: string[];
  };
  patterns: {
    velocity: {
      daily: number;
      weekly: number;
      monthly: number;
      peak: { date: Date; count: number };
    };
    timing: {
      hourDistribution: number[];
      dayDistribution: number[];
      seasonality: number[];
    };
    amounts: {
      distribution: Array<{ range: string; frequency: number }>;
      roundAmountFrequency: number;
      structuringIndicators: number;
    };
    counterparties: {
      unique: number;
      recurring: number;
      highRisk: number;
      geographic: Map<string, number>;
    };
  };
  anomalies: Array<{
    type: string;
    severity: number;
    description: string;
    firstObserved: Date;
    frequency: number;
  }>;
  riskScore: number;
  lastUpdated: Date;
}

export interface MLModel {
  id: string;
  name: string;
  type: 'supervised' | 'unsupervised' | 'ensemble' | 'deep_learning';
  algorithm: string;
  purpose:
    | 'classification'
    | 'clustering'
    | 'anomaly_detection'
    | 'risk_scoring';
  features: string[];
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    confusionMatrix: number[][];
  };
  training: {
    datasetSize: number;
    trainedAt: Date;
    version: string;
    validationMethod: string;
  };
  deployment: {
    status: 'training' | 'validating' | 'deployed' | 'deprecated';
    deployedAt?: Date;
    predictions: number;
    latency: number;
  };
}

export class TypologyDetector extends EventEmitter {
  private transactions = new Map<string, TransactionEvent>();
  private rules = new Map<string, TypologyRule>();
  private detections = new Map<string, TypologyDetection>();
  private profiles = new Map<string, BehavioralProfile>();
  private models = new Map<string, MLModel>();

  // Time series data for pattern analysis
  private transactionTimeSeries = new Map<string, TransactionEvent[]>();
  private velocityIndex = new Map<
    string,
    Array<{ timestamp: Date; count: number }>
  >();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeMLModels();
  }

  /**
   * Process transaction for typology detection
   */
  async processTransaction(transaction: TransactionEvent): Promise<{
    processed: boolean;
    detections: TypologyDetection[];
    profileUpdated: boolean;
  }> {
    // Store transaction
    this.transactions.set(transaction.id, transaction);

    // Update time series
    await this.updateTimeSeries(transaction);

    // Update behavioral profiles
    const profileUpdated = await this.updateBehavioralProfiles(transaction);

    // Run rule-based detection
    const ruleDetections = await this.runRuleBasedDetection(transaction);

    // Run ML-based detection
    const mlDetections = await this.runMLDetection(transaction);

    const allDetections = [...ruleDetections, ...mlDetections];

    // Process any new detections
    for (const detection of allDetections) {
      await this.processDetection(detection);
    }

    this.emit('transaction_processed', {
      transactionId: transaction.id,
      detections: allDetections.length,
      profiles: profileUpdated ? 1 : 0,
    });

    return {
      processed: true,
      detections: allDetections,
      profileUpdated,
    };
  }

  /**
   * Register custom typology rule
   */
  async registerRule(
    rule: Omit<TypologyRule, 'id' | 'statistics'>,
  ): Promise<TypologyRule> {
    const fullRule: TypologyRule = {
      ...rule,
      id: crypto.randomUUID(),
      statistics: {
        detections: 0,
        truePositives: 0,
        falsePositives: 0,
        precision: 0,
        recall: 0,
      },
    };

    await this.validateRule(fullRule);
    this.rules.set(fullRule.id, fullRule);

    this.emit('rule_registered', fullRule);
    return fullRule;
  }

  /**
   * Deploy ML model for typology detection
   */
  async deployModel(
    model: Omit<MLModel, 'id' | 'deployment'>,
  ): Promise<MLModel> {
    const fullModel: MLModel = {
      ...model,
      id: crypto.randomUUID(),
      deployment: {
        status: 'validating',
        predictions: 0,
        latency: 0,
      },
    };

    // Validate model performance
    if (
      fullModel.performance.precision < 0.8 ||
      fullModel.performance.recall < 0.7
    ) {
      throw new Error('Model performance below deployment threshold');
    }

    // Deploy model
    fullModel.deployment.status = 'deployed';
    fullModel.deployment.deployedAt = new Date();

    this.models.set(fullModel.id, fullModel);
    this.emit('model_deployed', fullModel);

    return fullModel;
  }

  /**
   * Generate behavioral profile for entity
   */
  async generateBehavioralProfile(
    entityId: string,
    timeframe: { start: Date; end: Date },
  ): Promise<BehavioralProfile> {
    const entityTransactions = Array.from(this.transactions.values()).filter(
      (tx) =>
        (tx.parties.originator.id === entityId ||
          tx.parties.beneficiary.id === entityId) &&
        tx.timestamp >= timeframe.start &&
        tx.timestamp <= timeframe.end,
    );

    if (entityTransactions.length === 0) {
      throw new Error('No transactions found for entity in timeframe');
    }

    const profile: BehavioralProfile = {
      entityId,
      timeframe,
      transactionSummary: this.calculateTransactionSummary(entityTransactions),
      patterns: await this.analyzeTransactionPatterns(entityTransactions),
      anomalies: await this.detectAnomalies(entityTransactions),
      riskScore: 0,
      lastUpdated: new Date(),
    };

    // Calculate risk score
    profile.riskScore = await this.calculateEntityRiskScore(profile);

    this.profiles.set(`${entityId}_${timeframe.start.getTime()}`, profile);
    this.emit('profile_generated', profile);

    return profile;
  }

  /**
   * Investigate typology detection
   */
  async investigateDetection(
    detectionId: string,
    analyst: string,
    action: 'investigate' | 'escalate' | 'close' | 'false_positive',
  ): Promise<TypologyDetection> {
    const detection = this.detections.get(detectionId);
    if (!detection) {
      throw new Error('Detection not found');
    }

    if (!detection.investigation) {
      detection.investigation = {
        status: 'open',
        notes: [],
        decisions: [],
      };
    }

    switch (action) {
      case 'investigate':
        detection.investigation.status = 'investigating';
        detection.investigation.analyst = analyst;
        break;

      case 'escalate':
        detection.investigation.status = 'escalated';
        detection.recommendation.priority = 'critical';
        break;

      case 'close':
        detection.investigation.status = 'closed';
        break;

      case 'false_positive':
        detection.investigation.status = 'false_positive';
        await this.updateRuleStatistics(detection.ruleId, false);
        break;
    }

    detection.investigation.decisions.push({
      timestamp: new Date(),
      decision: action,
      rationale: `Action taken by analyst: ${action}`,
      approver: analyst,
    });

    this.detections.set(detectionId, detection);
    this.emit('detection_investigated', { detection, action, analyst });

    return detection;
  }

  /**
   * Get detection statistics
   */
  getDetectionStatistics(timeframe?: { start: Date; end: Date }): {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    avgConfidence: number;
    falsePositiveRate: number;
    investigationStatus: Record<string, number>;
  } {
    let detections = Array.from(this.detections.values());

    if (timeframe) {
      detections = detections.filter(
        (d) => d.timestamp >= timeframe.start && d.timestamp <= timeframe.end,
      );
    }

    const bySeverity = detections.reduce(
      (acc, d) => {
        acc[d.severity] = (acc[d.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byCategory = detections.reduce(
      (acc, d) => {
        const rule = this.rules.get(d.ruleId);
        if (rule) {
          acc[rule.category] = (acc[rule.category] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgConfidence =
      detections.length > 0
        ? detections.reduce((sum, d) => sum + d.confidence, 0) /
          detections.length
        : 0;

    const falsePositives = detections.filter(
      (d) => d.investigation?.status === 'false_positive',
    ).length;
    const falsePositiveRate =
      detections.length > 0 ? falsePositives / detections.length : 0;

    const investigationStatus = detections.reduce(
      (acc, d) => {
        const status = d.investigation?.status || 'unassigned';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: detections.length,
      bySeverity,
      byCategory,
      avgConfidence,
      falsePositiveRate,
      investigationStatus,
    };
  }

  private async updateTimeSeries(transaction: TransactionEvent): Promise<void> {
    const entities = [
      transaction.parties.originator.id,
      transaction.parties.beneficiary.id,
    ];

    for (const entityId of entities) {
      if (!this.transactionTimeSeries.has(entityId)) {
        this.transactionTimeSeries.set(entityId, []);
      }

      const series = this.transactionTimeSeries.get(entityId)!;
      series.push(transaction);

      // Keep only last 90 days
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const filtered = series.filter((tx) => tx.timestamp >= cutoff);
      this.transactionTimeSeries.set(entityId, filtered);

      // Update velocity index
      this.updateVelocityIndex(entityId, transaction.timestamp);
    }
  }

  private updateVelocityIndex(entityId: string, timestamp: Date): void {
    if (!this.velocityIndex.has(entityId)) {
      this.velocityIndex.set(entityId, []);
    }

    const hourKey = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours(),
    );
    const velocityData = this.velocityIndex.get(entityId)!;

    const existing = velocityData.find(
      (v) => v.timestamp.getTime() === hourKey.getTime(),
    );
    if (existing) {
      existing.count++;
    } else {
      velocityData.push({ timestamp: hourKey, count: 1 });
    }

    // Keep only last 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filtered = velocityData.filter((v) => v.timestamp >= cutoff);
    this.velocityIndex.set(entityId, filtered);
  }

  private async updateBehavioralProfiles(
    transaction: TransactionEvent,
  ): Promise<boolean> {
    const entities = [
      transaction.parties.originator.id,
      transaction.parties.beneficiary.id,
    ];
    let updated = false;

    for (const entityId of entities) {
      const existingKey = Array.from(this.profiles.keys()).find((key) =>
        key.startsWith(entityId),
      );

      if (existingKey) {
        // Update existing profile
        const profile = this.profiles.get(existingKey)!;

        // Extend timeframe to include new transaction
        if (transaction.timestamp > profile.timeframe.end) {
          profile.timeframe.end = transaction.timestamp;
        }

        // Recalculate profile (simplified - in practice, incremental updates)
        const entityTransactions = Array.from(
          this.transactions.values(),
        ).filter(
          (tx) =>
            (tx.parties.originator.id === entityId ||
              tx.parties.beneficiary.id === entityId) &&
            tx.timestamp >= profile.timeframe.start &&
            tx.timestamp <= profile.timeframe.end,
        );

        profile.transactionSummary =
          this.calculateTransactionSummary(entityTransactions);
        profile.patterns =
          await this.analyzeTransactionPatterns(entityTransactions);
        profile.anomalies = await this.detectAnomalies(entityTransactions);
        profile.riskScore = await this.calculateEntityRiskScore(profile);
        profile.lastUpdated = new Date();

        this.profiles.set(existingKey, profile);
        updated = true;
      }
    }

    return updated;
  }

  private async runRuleBasedDetection(
    transaction: TransactionEvent,
  ): Promise<TypologyDetection[]> {
    const detections: TypologyDetection[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const detection = await this.evaluateRule(transaction, rule);
      if (detection) {
        detections.push(detection);
      }
    }

    return detections;
  }

  private async runMLDetection(
    transaction: TransactionEvent,
  ): Promise<TypologyDetection[]> {
    const detections: TypologyDetection[] = [];

    for (const model of this.models.values()) {
      if (model.deployment.status !== 'deployed') continue;

      const prediction = await this.applyMLModel(transaction, model);
      if (prediction && prediction.confidence > 0.8) {
        const detection = await this.createMLDetection(
          transaction,
          model,
          prediction,
        );
        detections.push(detection);
      }
    }

    return detections;
  }

  private async evaluateRule(
    transaction: TransactionEvent,
    rule: TypologyRule,
  ): Promise<TypologyDetection | null> {
    // Get relevant transactions for time window
    const windowStart = new Date(
      transaction.timestamp.getTime() - rule.conditions.temporal.timeWindow,
    );
    const relatedTransactions = this.getRelatedTransactions(
      transaction,
      windowStart,
    );

    // Check temporal conditions
    if (relatedTransactions.length < rule.conditions.temporal.minOccurrences) {
      return null;
    }

    if (
      rule.conditions.temporal.maxOccurrences &&
      relatedTransactions.length > rule.conditions.temporal.maxOccurrences
    ) {
      return null;
    }

    // Evaluate behavioral patterns
    const behavioralScore = await this.evaluateBehavioralPatterns(
      relatedTransactions,
      rule.conditions.behavioral,
    );

    if (behavioralScore < rule.conditions.behavioral.threshold) {
      return null;
    }

    // Evaluate network conditions
    const networkScore = await this.evaluateNetworkConditions(
      relatedTransactions,
      rule.conditions.network,
    );

    if (networkScore < 0.5) {
      return null;
    }

    // Create detection
    const detection: TypologyDetection = {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      timestamp: new Date(),
      confidence: (behavioralScore + networkScore) / 2,
      severity: rule.severity,
      transactions: relatedTransactions.map((tx) => tx.id),
      entities: this.extractEntities(relatedTransactions),
      pattern: {
        type: rule.name,
        description: rule.description,
        timeline: this.createTimeline(relatedTransactions),
        evidence: await this.generateEvidence(relatedTransactions, rule),
      },
      risk: {
        score: this.calculateRiskScore(relatedTransactions, rule),
        factors: await this.identifyRiskFactors(relatedTransactions),
        jurisdiction: transaction.parties.originator.jurisdiction || 'unknown',
        regulatory: ['BSA', 'PATRIOT_ACT'],
      },
      recommendation: {
        action: this.determineRecommendedAction(
          rule.severity,
          (behavioralScore + networkScore) / 2,
        ),
        priority: rule.severity,
        timeline: this.calculateInvestigationTimeline(rule.severity),
      },
    };

    return detection;
  }

  private getRelatedTransactions(
    transaction: TransactionEvent,
    windowStart: Date,
  ): TransactionEvent[] {
    const entities = [
      transaction.parties.originator.id,
      transaction.parties.beneficiary.id,
    ];

    return Array.from(this.transactions.values()).filter(
      (tx) =>
        tx.timestamp >= windowStart &&
        tx.timestamp <= transaction.timestamp &&
        (entities.includes(tx.parties.originator.id) ||
          entities.includes(tx.parties.beneficiary.id)),
    );
  }

  private async evaluateBehavioralPatterns(
    transactions: TransactionEvent[],
    conditions: TypologyRule['conditions']['behavioral'],
  ): Promise<number> {
    let totalScore = 0;
    let totalWeight = 0;

    for (const pattern of conditions.patterns) {
      const score = await this.evaluatePattern(transactions, pattern);
      totalScore += score * pattern.weight;
      totalWeight += pattern.weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private async evaluatePattern(
    transactions: TransactionEvent[],
    pattern: TypologyRule['conditions']['behavioral']['patterns'][0],
  ): Promise<number> {
    switch (pattern.type) {
      case 'velocity':
        return this.evaluateVelocityPattern(transactions, pattern);
      case 'amount':
        return this.evaluateAmountPattern(transactions, pattern);
      case 'geography':
        return this.evaluateGeographyPattern(transactions, pattern);
      case 'timing':
        return this.evaluateTimingPattern(transactions, pattern);
      default:
        return 0;
    }
  }

  private evaluateVelocityPattern(
    transactions: TransactionEvent[],
    pattern: TypologyRule['conditions']['behavioral']['patterns'][0],
  ): number {
    const velocityThreshold = pattern.value as number;
    const actualVelocity = transactions.length;

    switch (pattern.operator) {
      case 'greater_than':
        return actualVelocity > velocityThreshold ? 1.0 : 0.0;
      case 'less_than':
        return actualVelocity < velocityThreshold ? 1.0 : 0.0;
      case 'between':
        const [min, max] = pattern.value as [number, number];
        return actualVelocity >= min && actualVelocity <= max ? 1.0 : 0.0;
      default:
        return 0.0;
    }
  }

  private evaluateAmountPattern(
    transactions: TransactionEvent[],
    pattern: TypologyRule['conditions']['behavioral']['patterns'][0],
  ): number {
    const amounts = transactions.map((tx) => tx.amount);
    const threshold = pattern.value as number;

    switch (pattern.operator) {
      case 'greater_than':
        const aboveThreshold = amounts.filter((amt) => amt > threshold).length;
        return aboveThreshold / amounts.length;
      case 'pattern_match':
        // Check for structuring patterns (amounts just under reporting thresholds)
        const structuring = amounts.filter(
          (amt) => amt >= threshold * 0.9 && amt < threshold,
        ).length;
        return structuring > 0 ? structuring / amounts.length : 0.0;
      default:
        return 0.0;
    }
  }

  private evaluateGeographyPattern(
    transactions: TransactionEvent[],
    pattern: TypologyRule['conditions']['behavioral']['patterns'][0],
  ): number {
    const highRiskJurisdictions = pattern.value as string[];
    const jurisdictions = transactions
      .flatMap((tx) => [
        tx.parties.originator.jurisdiction,
        tx.parties.beneficiary.jurisdiction,
      ])
      .filter(Boolean);

    const highRiskCount = jurisdictions.filter((j) =>
      highRiskJurisdictions.includes(j!),
    ).length;
    return jurisdictions.length > 0
      ? highRiskCount / jurisdictions.length
      : 0.0;
  }

  private evaluateTimingPattern(
    transactions: TransactionEvent[],
    pattern: TypologyRule['conditions']['behavioral']['patterns'][0],
  ): number {
    // Check for unusual timing patterns (e.g., all transactions outside business hours)
    const nonBusinessHours = transactions.filter((tx) => {
      const hour = tx.timestamp.getHours();
      return hour < 9 || hour > 17;
    }).length;

    return transactions.length > 0
      ? nonBusinessHours / transactions.length
      : 0.0;
  }

  private async evaluateNetworkConditions(
    transactions: TransactionEvent[],
    conditions: TypologyRule['conditions']['network'],
  ): Promise<number> {
    const entities = new Set<string>();
    transactions.forEach((tx) => {
      entities.add(tx.parties.originator.id);
      entities.add(tx.parties.beneficiary.id);
    });

    if (entities.size < conditions.minNodes) {
      return 0.0;
    }

    // Calculate network density and complexity
    const connections = transactions.length;
    const maxConnections = (entities.size * (entities.size - 1)) / 2;
    const density = maxConnections > 0 ? connections / maxConnections : 0;

    return Math.min(density * 2, 1.0); // Scale to 0-1
  }

  private calculateTransactionSummary(
    transactions: TransactionEvent[],
  ): BehavioralProfile['transactionSummary'] {
    const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const currencies = [...new Set(transactions.map((tx) => tx.currency))];
    const channels = [...new Set(transactions.map((tx) => tx.type))];
    const jurisdictions = [
      ...new Set(
        transactions
          .flatMap((tx) => [
            tx.parties.originator.jurisdiction,
            tx.parties.beneficiary.jurisdiction,
          ])
          .filter(Boolean),
      ),
    ];

    return {
      count: transactions.length,
      totalVolume,
      averageAmount:
        transactions.length > 0 ? totalVolume / transactions.length : 0,
      currencies,
      channels,
      jurisdictions,
    };
  }

  private async analyzeTransactionPatterns(
    transactions: TransactionEvent[],
  ): Promise<BehavioralProfile['patterns']> {
    // Calculate velocity patterns
    const dailyGroups = this.groupByDay(transactions);
    const dailyVelocity = Object.values(dailyGroups).map(
      (group) => group.length,
    );

    // Calculate timing patterns
    const hourDistribution = new Array(24).fill(0);
    const dayDistribution = new Array(7).fill(0);

    transactions.forEach((tx) => {
      hourDistribution[tx.timestamp.getHours()]++;
      dayDistribution[tx.timestamp.getDay()]++;
    });

    // Calculate amount patterns
    const amounts = transactions.map((tx) => tx.amount);
    const roundAmounts = amounts.filter(
      (amt) => amt % 1000 === 0 || amt % 500 === 0,
    );

    return {
      velocity: {
        daily:
          dailyVelocity.length > 0
            ? dailyVelocity.reduce((a, b) => a + b, 0) / dailyVelocity.length
            : 0,
        weekly: Math.ceil(transactions.length / 7),
        monthly: Math.ceil(transactions.length / 30),
        peak: {
          date: new Date(),
          count: Math.max(...dailyVelocity, 0),
        },
      },
      timing: {
        hourDistribution,
        dayDistribution,
        seasonality: [], // Would require longer time series
      },
      amounts: {
        distribution: this.calculateAmountDistribution(amounts),
        roundAmountFrequency: roundAmounts.length / amounts.length,
        structuringIndicators: this.detectStructuringIndicators(amounts),
      },
      counterparties: {
        unique: this.countUniqueCounterparties(transactions),
        recurring: this.countRecurringCounterparties(transactions),
        highRisk: this.countHighRiskCounterparties(transactions),
        geographic: this.analyzeGeographicDistribution(transactions),
      },
    };
  }

  private async detectAnomalies(
    transactions: TransactionEvent[],
  ): Promise<BehavioralProfile['anomalies']> {
    const anomalies: BehavioralProfile['anomalies'] = [];

    // Detect amount anomalies
    const amounts = transactions.map((tx) => tx.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sq, n) => sq + Math.pow(n - avgAmount, 2), 0) /
        amounts.length,
    );

    const outliers = amounts.filter(
      (amt) => Math.abs(amt - avgAmount) > 2 * stdDev,
    );
    if (outliers.length > 0) {
      anomalies.push({
        type: 'amount_outlier',
        severity: outliers.length / amounts.length,
        description: `${outliers.length} transactions with unusual amounts`,
        firstObserved: new Date(),
        frequency: outliers.length,
      });
    }

    return anomalies;
  }

  private async calculateEntityRiskScore(
    profile: BehavioralProfile,
  ): Promise<number> {
    let riskScore = 0;

    // Volume risk
    if (profile.transactionSummary.totalVolume > 1000000) {
      riskScore += 0.3;
    }

    // Velocity risk
    if (profile.patterns.velocity.daily > 50) {
      riskScore += 0.3;
    }

    // Geographic risk
    const highRiskJurisdictions = ['XX', 'YY']; // Mock high-risk jurisdictions
    const hasHighRisk = profile.transactionSummary.jurisdictions.some((j) =>
      highRiskJurisdictions.includes(j),
    );
    if (hasHighRisk) {
      riskScore += 0.2;
    }

    // Structuring risk
    if (profile.patterns.amounts.structuringIndicators > 0.3) {
      riskScore += 0.2;
    }

    return Math.min(riskScore, 1.0);
  }

  private async applyMLModel(
    transaction: TransactionEvent,
    model: MLModel,
  ): Promise<{ confidence: number; prediction: string } | null> {
    // Mock ML model application
    const features = this.extractFeatures(transaction, model.features);

    // Simulate model prediction
    const confidence = Math.random() * 0.3 + 0.5; // Mock confidence between 0.5-0.8
    const prediction = confidence > 0.7 ? 'suspicious' : 'normal';

    // Update model statistics
    model.deployment.predictions++;
    model.deployment.latency = Math.random() * 50 + 10; // Mock latency

    return { confidence, prediction };
  }

  private extractFeatures(
    transaction: TransactionEvent,
    featureNames: string[],
  ): number[] {
    // Extract numerical features for ML model
    const features: number[] = [];

    featureNames.forEach((name) => {
      switch (name) {
        case 'amount':
          features.push(transaction.amount);
          break;
        case 'hour':
          features.push(transaction.timestamp.getHours());
          break;
        case 'day_of_week':
          features.push(transaction.timestamp.getDay());
          break;
        case 'is_round_amount':
          features.push(transaction.amount % 1000 === 0 ? 1 : 0);
          break;
        case 'high_risk_jurisdiction':
          features.push(
            transaction.riskIndicators.highRiskJurisdiction ? 1 : 0,
          );
          break;
        default:
          features.push(0);
      }
    });

    return features;
  }

  private async createMLDetection(
    transaction: TransactionEvent,
    model: MLModel,
    prediction: { confidence: number; prediction: string },
  ): Promise<TypologyDetection> {
    return {
      id: crypto.randomUUID(),
      ruleId: model.id,
      timestamp: new Date(),
      confidence: prediction.confidence,
      severity: prediction.confidence > 0.9 ? 'high' : 'medium',
      transactions: [transaction.id],
      entities: [
        transaction.parties.originator.id,
        transaction.parties.beneficiary.id,
      ],
      pattern: {
        type: `ML_${model.algorithm}`,
        description: `Suspicious pattern detected by ${model.name}`,
        timeline: [
          {
            timestamp: transaction.timestamp,
            event: 'suspicious_transaction',
            significance: prediction.confidence,
          },
        ],
        evidence: [
          {
            type: 'statistical',
            description: `ML model confidence: ${prediction.confidence}`,
            strength: prediction.confidence,
            data: { model: model.name, algorithm: model.algorithm },
          },
        ],
      },
      risk: {
        score: prediction.confidence,
        factors: [
          {
            factor: 'ml_prediction',
            impact: prediction.confidence,
            explanation: `${model.name} flagged this transaction as ${prediction.prediction}`,
          },
        ],
        jurisdiction: transaction.parties.originator.jurisdiction || 'unknown',
        regulatory: ['ML_COMPLIANCE'],
      },
      recommendation: {
        action: prediction.confidence > 0.9 ? 'escalate' : 'investigate',
        priority: prediction.confidence > 0.9 ? 'high' : 'medium',
        timeline: prediction.confidence > 0.9 ? '24 hours' : '72 hours',
      },
    };
  }

  private async processDetection(detection: TypologyDetection): Promise<void> {
    this.detections.set(detection.id, detection);

    // Update rule statistics
    await this.updateRuleStatistics(detection.ruleId, true);

    // Emit event for downstream processing
    this.emit('typology_detected', detection);

    // Auto-escalate critical detections
    if (detection.severity === 'critical') {
      this.emit('critical_detection', detection);
    }
  }

  private async updateRuleStatistics(
    ruleId: string,
    isDetection: boolean,
  ): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule) {
      if (isDetection) {
        rule.statistics.detections++;
        rule.statistics.lastTriggered = new Date();
      }

      // Update precision/recall (simplified)
      const total =
        rule.statistics.truePositives + rule.statistics.falsePositives;
      if (total > 0) {
        rule.statistics.precision = rule.statistics.truePositives / total;
      }

      this.rules.set(ruleId, rule);
    }
  }

  private async validateRule(rule: TypologyRule): Promise<void> {
    if (rule.conditions.temporal.timeWindow <= 0) {
      throw new Error('Invalid time window');
    }

    if (
      rule.conditions.behavioral.threshold < 0 ||
      rule.conditions.behavioral.threshold > 1
    ) {
      throw new Error('Behavioral threshold must be between 0 and 1');
    }
  }

  private extractEntities(transactions: TransactionEvent[]): string[] {
    const entities = new Set<string>();
    transactions.forEach((tx) => {
      entities.add(tx.parties.originator.id);
      entities.add(tx.parties.beneficiary.id);
    });
    return Array.from(entities);
  }

  private createTimeline(
    transactions: TransactionEvent[],
  ): TypologyDetection['pattern']['timeline'] {
    return transactions
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((tx) => ({
        timestamp: tx.timestamp,
        event: `${tx.type}_transaction`,
        significance: tx.amount > 10000 ? 0.8 : 0.5,
      }));
  }

  private async generateEvidence(
    transactions: TransactionEvent[],
    rule: TypologyRule,
  ): Promise<TypologyDetection['pattern']['evidence']> {
    const evidence: TypologyDetection['pattern']['evidence'] = [];

    // Add statistical evidence
    evidence.push({
      type: 'statistical',
      description: `${transactions.length} transactions in ${rule.conditions.temporal.timeWindow / 3600000} hours`,
      strength: 0.8,
      data: {
        count: transactions.length,
        timeWindow: rule.conditions.temporal.timeWindow,
      },
    });

    // Add behavioral evidence
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    evidence.push({
      type: 'behavioral',
      description: `Total transaction volume: ${totalAmount}`,
      strength: totalAmount > 100000 ? 0.9 : 0.6,
      data: { totalAmount, avgAmount: totalAmount / transactions.length },
    });

    return evidence;
  }

  private calculateRiskScore(
    transactions: TransactionEvent[],
    rule: TypologyRule,
  ): number {
    let riskScore = rule.confidence;

    // Adjust based on transaction characteristics
    const highValueTxs = transactions.filter((tx) => tx.amount > 50000).length;
    if (highValueTxs > 0) {
      riskScore += 0.1;
    }

    const highRiskJurisdictions = transactions.filter(
      (tx) => tx.riskIndicators.highRiskJurisdiction,
    ).length;
    if (highRiskJurisdictions > 0) {
      riskScore += 0.2;
    }

    return Math.min(riskScore, 1.0);
  }

  private async identifyRiskFactors(
    transactions: TransactionEvent[],
  ): Promise<TypologyDetection['risk']['factors']> {
    const factors: TypologyDetection['risk']['factors'] = [];

    // Volume factor
    const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    if (totalVolume > 500000) {
      factors.push({
        factor: 'high_volume',
        impact: 0.3,
        explanation: `Total volume of ${totalVolume} exceeds threshold`,
      });
    }

    // Velocity factor
    if (transactions.length > 20) {
      factors.push({
        factor: 'high_velocity',
        impact: 0.2,
        explanation: `${transactions.length} transactions in short timeframe`,
      });
    }

    return factors;
  }

  private determineRecommendedAction(
    severity: TypologyRule['severity'],
    confidence: number,
  ): TypologyDetection['recommendation']['action'] {
    if (severity === 'critical' || confidence > 0.95) return 'file_sar';
    if (severity === 'high' || confidence > 0.85) return 'escalate';
    if (severity === 'medium' || confidence > 0.7) return 'investigate';
    return 'monitor';
  }

  private calculateInvestigationTimeline(
    severity: TypologyRule['severity'],
  ): string {
    switch (severity) {
      case 'critical':
        return '4 hours';
      case 'high':
        return '24 hours';
      case 'medium':
        return '72 hours';
      default:
        return '7 days';
    }
  }

  // Helper methods for behavioral analysis
  private groupByDay(
    transactions: TransactionEvent[],
  ): Record<string, TransactionEvent[]> {
    return transactions.reduce(
      (groups, tx) => {
        const day = tx.timestamp.toISOString().split('T')[0];
        groups[day] = groups[day] || [];
        groups[day].push(tx);
        return groups;
      },
      {} as Record<string, TransactionEvent[]>,
    );
  }

  private calculateAmountDistribution(
    amounts: number[],
  ): Array<{ range: string; frequency: number }> {
    const ranges = [
      { range: '0-1K', min: 0, max: 1000 },
      { range: '1K-10K', min: 1000, max: 10000 },
      { range: '10K-100K', min: 10000, max: 100000 },
      { range: '100K+', min: 100000, max: Infinity },
    ];

    return ranges.map((range) => ({
      range: range.range,
      frequency:
        amounts.filter((amt) => amt >= range.min && amt < range.max).length /
        amounts.length,
    }));
  }

  private detectStructuringIndicators(amounts: number[]): number {
    const structuringThreshold = 10000;
    const nearThreshold = amounts.filter(
      (amt) => amt >= structuringThreshold * 0.9 && amt < structuringThreshold,
    );

    return amounts.length > 0 ? nearThreshold.length / amounts.length : 0;
  }

  private countUniqueCounterparties(transactions: TransactionEvent[]): number {
    const counterparties = new Set<string>();
    transactions.forEach((tx) => {
      counterparties.add(tx.parties.originator.id);
      counterparties.add(tx.parties.beneficiary.id);
    });
    return counterparties.size;
  }

  private countRecurringCounterparties(
    transactions: TransactionEvent[],
  ): number {
    const counts = new Map<string, number>();
    transactions.forEach((tx) => {
      const parties = [tx.parties.originator.id, tx.parties.beneficiary.id];
      parties.forEach((party) => {
        counts.set(party, (counts.get(party) || 0) + 1);
      });
    });

    return Array.from(counts.values()).filter((count) => count > 5).length;
  }

  private countHighRiskCounterparties(
    transactions: TransactionEvent[],
  ): number {
    return transactions.filter(
      (tx) => tx.riskIndicators.sanctionsHit || tx.riskIndicators.pepInvolved,
    ).length;
  }

  private analyzeGeographicDistribution(
    transactions: TransactionEvent[],
  ): Map<string, number> {
    const distribution = new Map<string, number>();

    transactions.forEach((tx) => {
      const jurisdictions = [
        tx.parties.originator.jurisdiction,
        tx.parties.beneficiary.jurisdiction,
      ].filter(Boolean);

      jurisdictions.forEach((jurisdiction) => {
        distribution.set(
          jurisdiction!,
          (distribution.get(jurisdiction!) || 0) + 1,
        );
      });
    });

    return distribution;
  }

  private initializeDefaultRules(): void {
    // Rapid Fire Transfers (Velocity-based)
    this.registerRule({
      name: 'Rapid Fire Transfers',
      category: 'money_laundering',
      severity: 'high',
      confidence: 0.85,
      description:
        'Multiple transfers in short time period indicating possible layering',
      conditions: {
        temporal: {
          timeWindow: 3600000, // 1 hour
          minOccurrences: 10,
        },
        behavioral: {
          patterns: [
            {
              type: 'velocity',
              operator: 'greater_than',
              value: 10,
              weight: 0.8,
            },
          ],
          threshold: 0.7,
        },
        network: {
          relationships: [],
          minNodes: 2,
          maxDegrees: 3,
        },
      },
      actions: [
        {
          type: 'escalate',
          parameters: { priority: 'high' },
        },
      ],
      enabled: true,
    });

    // Structuring Pattern
    this.registerRule({
      name: 'Structuring Pattern',
      category: 'money_laundering',
      severity: 'critical',
      confidence: 0.9,
      description: 'Multiple transactions just below reporting thresholds',
      conditions: {
        temporal: {
          timeWindow: 86400000, // 24 hours
          minOccurrences: 3,
        },
        behavioral: {
          patterns: [
            {
              type: 'amount',
              operator: 'pattern_match',
              value: 10000, // CTR threshold
              weight: 1.0,
            },
          ],
          threshold: 0.8,
        },
        network: {
          relationships: [],
          minNodes: 1,
          maxDegrees: 2,
        },
      },
      actions: [
        {
          type: 'file_sar',
          parameters: { urgency: 'immediate' },
        },
      ],
      enabled: true,
    });
  }

  private initializeMLModels(): void {
    // Anomaly Detection Model
    this.deployModel({
      name: 'Transaction Anomaly Detector',
      type: 'unsupervised',
      algorithm: 'isolation_forest',
      purpose: 'anomaly_detection',
      features: [
        'amount',
        'hour',
        'day_of_week',
        'is_round_amount',
        'high_risk_jurisdiction',
      ],
      performance: {
        accuracy: 0.87,
        precision: 0.82,
        recall: 0.78,
        f1Score: 0.8,
        auc: 0.85,
        confusionMatrix: [
          [850, 50],
          [45, 155],
        ],
      },
      training: {
        datasetSize: 100000,
        trainedAt: new Date(),
        version: '1.0.0',
        validationMethod: 'cross_validation',
      },
    });

    // Risk Classification Model
    this.deployModel({
      name: 'AML Risk Classifier',
      type: 'supervised',
      algorithm: 'gradient_boosting',
      purpose: 'classification',
      features: [
        'amount',
        'velocity',
        'counterparty_risk',
        'jurisdiction_risk',
        'time_pattern',
      ],
      performance: {
        accuracy: 0.91,
        precision: 0.88,
        recall: 0.84,
        f1Score: 0.86,
        auc: 0.92,
        confusionMatrix: [
          [920, 80],
          [35, 165],
        ],
      },
      training: {
        datasetSize: 150000,
        trainedAt: new Date(),
        version: '2.1.0',
        validationMethod: 'holdout',
      },
    });
  }
}
