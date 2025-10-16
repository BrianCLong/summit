import { EventEmitter } from 'events';
import { createLogger } from '../config/logger';

const logger = createLogger('KeyRiskMLExplainer');

export interface SHAPExplanation {
  keyId: string;
  timestamp: Date;
  prediction: KeyRiskPrediction;
  shapValues: SHAPValue[];
  baseValue: number;
  expectedValue: number;
  explanation: string;
  confidence: number;
  featureImportances: FeatureImportance[];
  riskFactors: RiskFactor[];
  auditTrail: AuditEntry[];
}

export interface SHAPValue {
  featureName: string;
  value: number;
  contribution: number;
  rank: number;
  direction: 'positive' | 'negative';
  magnitude: 'high' | 'medium' | 'low';
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  sensitivity: number;
  description: string;
}

export interface RiskFactor {
  factor: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contribution: number;
  mitigation: string;
  urgency: number;
}

export interface KeyRiskPrediction {
  keyId: string;
  rotationRecommended: boolean;
  riskScore: number;
  timeToRotation: number; // hours
  confidence: number;
  riskCategory: 'usage' | 'age' | 'security' | 'performance' | 'compliance';
  reasoning: string[];
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  user?: string;
  reason: string;
  evidence: Record<string, any>;
  impact: 'low' | 'medium' | 'high';
}

export interface ExplainerConfig {
  shapSampleSize: number;
  baselineWindow: number; // hours
  sensitivityThreshold: number;
  auditRetention: number; // days
  explainabilityLevel: 'basic' | 'detailed' | 'comprehensive';
}

export interface FeatureTrends {
  keyId: string;
  timeRange: [Date, Date];
  trends: {
    usageFrequency: TrendData;
    errorRate: TrendData;
    latency: TrendData;
    securityEvents: TrendData;
    complianceScore: TrendData;
    userSatisfaction: TrendData;
  };
  correlations: FeatureCorrelation[];
  anomalies: AnomalyDetection[];
}

export interface TrendData {
  feature: string;
  values: number[];
  timestamps: Date[];
  slope: number;
  variance: number;
  seasonality: number;
  changePoints: Date[];
}

export interface FeatureCorrelation {
  feature1: string;
  feature2: string;
  correlation: number;
  significance: number;
  interpretation: string;
}

export interface AnomalyDetection {
  timestamp: Date;
  feature: string;
  value: number;
  expectedValue: number;
  anomalyScore: number;
  type: 'point' | 'contextual' | 'collective';
  severity: 'low' | 'medium' | 'high';
}

/**
 * KeyRiskMLExplainer - SHAP-style feature importance for key rotation decisions with auditability
 *
 * Key Features:
 * - SHAP (SHapley Additive exPlanations) value calculation for key rotation decisions
 * - Feature importance analysis with trend tracking and sensitivity measurement
 * - Risk factor identification and mitigation recommendations
 * - Comprehensive audit trail for all explanations and decisions
 * - Anomaly detection in key usage patterns and security events
 * - Time-series analysis for feature trend identification
 * - Correlation analysis between different risk factors
 * - Multi-level explainability (basic, detailed, comprehensive)
 * - Real-time explanation generation for key rotation recommendations
 */
export class KeyRiskMLExplainer extends EventEmitter {
  private config: ExplainerConfig;
  private explanationHistory: Map<string, SHAPExplanation[]> = new Map();
  private featureBaselines: Map<string, number> = new Map();
  private auditLog: AuditEntry[] = [];

  // Feature definitions for key risk assessment
  private riskFeatures = [
    'usage_frequency',
    'error_rate',
    'latency_p95',
    'security_events',
    'compliance_score',
    'key_age_days',
    'user_satisfaction',
    'request_volume',
    'geographic_spread',
    'time_since_incident',
    'algorithm_strength',
    'provider_reliability',
  ];

  // SHAP computation cache
  private shapCache: Map<string, any> = new Map();
  private coalitionCache: Map<string, number> = new Map();

  constructor(config: Partial<ExplainerConfig> = {}) {
    super();
    this.config = {
      shapSampleSize: 100,
      baselineWindow: 168, // 7 days
      sensitivityThreshold: 0.1,
      auditRetention: 90, // 90 days
      explainabilityLevel: 'detailed',
      ...config,
    };

    this.initializeBaselines();

    logger.info('KeyRiskMLExplainer initialized', {
      shapSampleSize: this.config.shapSampleSize,
      explainabilityLevel: this.config.explainabilityLevel,
      riskFeatures: this.riskFeatures.length,
    });
  }

  /**
   * Generate SHAP explanation for key rotation decision
   */
  async generateSHAPExplanation(
    keyId: string,
    features: any,
    modelPrediction: KeyRiskPrediction,
  ): Promise<SHAPExplanation> {
    try {
      const timestamp = new Date();

      // Calculate SHAP values using Kernel SHAP approximation
      const shapValues = await this.calculateKernelSHAP(
        keyId,
        features,
        modelPrediction,
      );

      // Calculate feature importances
      const featureImportances = this.calculateFeatureImportances(
        shapValues,
        features,
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(shapValues, features);

      // Generate human-readable explanation
      const explanation = this.generateHumanExplanation(
        shapValues,
        modelPrediction,
      );

      // Calculate explanation confidence
      const confidence = this.calculateExplanationConfidence(
        shapValues,
        modelPrediction,
      );

      // Create audit trail entry
      const auditEntry: AuditEntry = {
        timestamp,
        action: 'generate_explanation',
        reason: `SHAP explanation for key ${keyId}`,
        evidence: {
          prediction: modelPrediction,
          features: this.sanitizeFeatures(features),
          shapValuesCount: shapValues.length,
        },
        impact:
          modelPrediction.riskScore > 0.8
            ? 'high'
            : modelPrediction.riskScore > 0.5
              ? 'medium'
              : 'low',
      };

      this.addAuditEntry(auditEntry);

      const shapExplanation: SHAPExplanation = {
        keyId,
        timestamp,
        prediction: modelPrediction,
        shapValues,
        baseValue: this.getBaselineValue(keyId),
        expectedValue: modelPrediction.riskScore,
        explanation,
        confidence,
        featureImportances,
        riskFactors,
        auditTrail: [auditEntry],
      };

      // Store explanation
      this.storeExplanation(keyId, shapExplanation);

      // Emit explanation event
      this.emit('explanation_generated', {
        keyId,
        riskScore: modelPrediction.riskScore,
        confidence,
        topFeatures: shapValues.slice(0, 3).map((sv) => sv.featureName),
      });

      logger.debug('SHAP explanation generated', {
        keyId,
        riskScore: modelPrediction.riskScore.toFixed(3),
        confidence: confidence.toFixed(3),
        topContributors: shapValues
          .slice(0, 3)
          .map((sv) => `${sv.featureName}: ${sv.contribution.toFixed(3)}`),
      });

      return shapExplanation;
    } catch (error) {
      logger.error('Failed to generate SHAP explanation', { error, keyId });
      this.emit('explanation_error', { error, keyId });
      throw error;
    }
  }

  /**
   * Get feature importance trends over time
   */
  async getFeatureImportanceTrends(
    keyId: string,
    timeRange: [Date, Date],
  ): Promise<FeatureTrends> {
    try {
      const explanations = this.getExplanationsInRange(keyId, timeRange);

      if (explanations.length === 0) {
        throw new Error(
          `No explanations found for key ${keyId} in the specified time range`,
        );
      }

      // Extract trend data for each feature
      const trends: FeatureTrends['trends'] = {} as any;

      for (const feature of this.riskFeatures) {
        const values: number[] = [];
        const timestamps: Date[] = [];

        for (const explanation of explanations) {
          const shapValue = explanation.shapValues.find(
            (sv) => sv.featureName === feature,
          );
          if (shapValue) {
            values.push(shapValue.contribution);
            timestamps.push(explanation.timestamp);
          }
        }

        if (values.length > 1) {
          trends[feature] = this.analyzeTrend(feature, values, timestamps);
        }
      }

      // Calculate correlations between features
      const correlations = this.calculateFeatureCorrelations(explanations);

      // Detect anomalies in feature patterns
      const anomalies = this.detectFeatureAnomalies(explanations, timeRange);

      const featureTrends: FeatureTrends = {
        keyId,
        timeRange,
        trends,
        correlations,
        anomalies,
      };

      this.emit('trends_analyzed', {
        keyId,
        timeRange,
        trendCount: Object.keys(trends).length,
        correlationCount: correlations.length,
        anomalyCount: anomalies.length,
      });

      logger.debug('Feature importance trends analyzed', {
        keyId,
        timeRangeHours:
          (timeRange[1].getTime() - timeRange[0].getTime()) / (1000 * 60 * 60),
        trendsAnalyzed: Object.keys(trends).length,
        correlationsFound: correlations.length,
        anomaliesDetected: anomalies.length,
      });

      return featureTrends;
    } catch (error) {
      logger.error('Failed to analyze feature importance trends', {
        error,
        keyId,
        timeRange,
      });
      throw error;
    }
  }

  /**
   * Calculate Kernel SHAP values
   */
  private async calculateKernelSHAP(
    keyId: string,
    features: any,
    prediction: KeyRiskPrediction,
  ): Promise<SHAPValue[]> {
    const cacheKey = `${keyId}_${JSON.stringify(features)}_${prediction.riskScore}`;

    if (this.shapCache.has(cacheKey)) {
      return this.shapCache.get(cacheKey);
    }

    const shapValues: SHAPValue[] = [];
    const numFeatures = this.riskFeatures.length;

    // Generate sample coalitions for SHAP approximation
    const coalitions = this.generateCoalitions(
      numFeatures,
      this.config.shapSampleSize,
    );

    // Calculate marginal contributions for each feature
    for (let i = 0; i < numFeatures; i++) {
      const featureName = this.riskFeatures[i];
      const featureValue = features[featureName] || 0;

      let totalContribution = 0;
      let coalitionCount = 0;

      for (const coalition of coalitions) {
        if (coalition.includes(i)) {
          // Coalition with feature i
          const withFeature = this.evaluateCoalition(
            coalition,
            features,
            prediction,
          );

          // Coalition without feature i
          const withoutFeature = this.evaluateCoalition(
            coalition.filter((idx) => idx !== i),
            features,
            prediction,
          );

          totalContribution += withFeature - withoutFeature;
          coalitionCount++;
        }
      }

      const contribution =
        coalitionCount > 0 ? totalContribution / coalitionCount : 0;

      shapValues.push({
        featureName,
        value: featureValue,
        contribution,
        rank: 0, // Will be set after sorting
        direction: contribution >= 0 ? 'positive' : 'negative',
        magnitude: this.getMagnitude(Math.abs(contribution)),
      });
    }

    // Sort by absolute contribution and assign ranks
    shapValues.sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
    );
    shapValues.forEach((sv, index) => (sv.rank = index + 1));

    // Cache the result
    this.shapCache.set(cacheKey, shapValues);

    return shapValues;
  }

  /**
   * Generate coalitions for SHAP calculation
   */
  private generateCoalitions(
    numFeatures: number,
    sampleSize: number,
  ): number[][] {
    const coalitions: number[][] = [];

    // Always include empty coalition and full coalition
    coalitions.push([]);
    coalitions.push(Array.from({ length: numFeatures }, (_, i) => i));

    // Generate random coalitions
    for (let i = 0; i < sampleSize - 2; i++) {
      const coalition: number[] = [];
      for (let j = 0; j < numFeatures; j++) {
        if (Math.random() < 0.5) {
          coalition.push(j);
        }
      }
      coalitions.push(coalition);
    }

    return coalitions;
  }

  /**
   * Evaluate a coalition's contribution to the prediction
   */
  private evaluateCoalition(
    coalition: number[],
    features: any,
    prediction: KeyRiskPrediction,
  ): number {
    const coalitionKey = coalition.sort().join(',');

    if (this.coalitionCache.has(coalitionKey)) {
      return this.coalitionCache.get(coalitionKey)!;
    }

    // Simplified model evaluation (in practice, would use actual ML model)
    let score = 0;
    const weight = 1 / coalition.length || 1;

    for (const featureIdx of coalition) {
      const featureName = this.riskFeatures[featureIdx];
      const featureValue = features[featureName] || 0;

      // Simple linear contribution model (would be replaced with actual model)
      switch (featureName) {
        case 'usage_frequency':
          score += featureValue * 0.15;
          break;
        case 'error_rate':
          score += featureValue * 0.25;
          break;
        case 'security_events':
          score += featureValue * 0.3;
          break;
        case 'key_age_days':
          score += Math.min(featureValue / 365, 1) * 0.2;
          break;
        case 'compliance_score':
          score += (1 - featureValue) * 0.1;
          break;
        default:
          score += featureValue * 0.05;
      }
    }

    score = Math.min(1, Math.max(0, score)) * weight;

    this.coalitionCache.set(coalitionKey, score);
    return score;
  }

  /**
   * Calculate feature importances with trends
   */
  private calculateFeatureImportances(
    shapValues: SHAPValue[],
    features: any,
  ): FeatureImportance[] {
    const importances: FeatureImportance[] = [];

    for (const shapValue of shapValues) {
      const baseline = this.featureBaselines.get(shapValue.featureName) || 0;
      const currentValue = shapValue.value;
      const trend = this.calculateTrend(
        shapValue.featureName,
        currentValue,
        baseline,
      );

      importances.push({
        feature: shapValue.featureName,
        importance: Math.abs(shapValue.contribution),
        trend,
        sensitivity: this.calculateSensitivity(shapValue.featureName, features),
        description: this.getFeatureDescription(shapValue.featureName),
      });
    }

    return importances.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Identify risk factors from SHAP values
   */
  private identifyRiskFactors(
    shapValues: SHAPValue[],
    features: any,
  ): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // Focus on top contributing features
    const topContributors = shapValues.slice(0, 5);

    for (const shapValue of topContributors) {
      if (shapValue.direction === 'positive' && shapValue.contribution > 0.1) {
        const riskLevel = this.assessRiskLevel(shapValue.contribution);
        const mitigation = this.generateMitigation(
          shapValue.featureName,
          shapValue.value,
        );
        const urgency = this.calculateUrgency(
          shapValue.contribution,
          riskLevel,
        );

        riskFactors.push({
          factor: shapValue.featureName,
          riskLevel,
          contribution: shapValue.contribution,
          mitigation,
          urgency,
        });
      }
    }

    return riskFactors.sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * Generate human-readable explanation
   */
  private generateHumanExplanation(
    shapValues: SHAPValue[],
    prediction: KeyRiskPrediction,
  ): string {
    const topPositive = shapValues
      .filter((sv) => sv.direction === 'positive')
      .slice(0, 3);

    const topNegative = shapValues
      .filter((sv) => sv.direction === 'negative')
      .slice(0, 2);

    let explanation = `Key rotation recommendation: ${prediction.rotationRecommended ? 'ROTATE' : 'KEEP'} `;
    explanation += `(Risk Score: ${(prediction.riskScore * 100).toFixed(1)}%)\n\n`;

    if (topPositive.length > 0) {
      explanation += 'Primary risk factors:\n';
      for (const sv of topPositive) {
        explanation += `• ${this.humanizeFeatureName(sv.featureName)}: `;
        explanation += `${this.explainContribution(sv)}\n`;
      }
    }

    if (topNegative.length > 0) {
      explanation += '\nMitigating factors:\n';
      for (const sv of topNegative) {
        explanation += `• ${this.humanizeFeatureName(sv.featureName)}: `;
        explanation += `${this.explainContribution(sv)}\n`;
      }
    }

    if (prediction.rotationRecommended) {
      explanation += `\nRecommended action: Rotate key within ${prediction.timeToRotation} hours.`;
    }

    return explanation;
  }

  /**
   * Calculate explanation confidence
   */
  private calculateExplanationConfidence(
    shapValues: SHAPValue[],
    prediction: KeyRiskPrediction,
  ): number {
    // Base confidence on SHAP value consistency and prediction confidence
    const totalContribution = shapValues.reduce(
      (sum, sv) => sum + Math.abs(sv.contribution),
      0,
    );
    const topContribution = shapValues
      .slice(0, 3)
      .reduce((sum, sv) => sum + Math.abs(sv.contribution), 0);

    const concentrationRatio =
      totalContribution > 0 ? topContribution / totalContribution : 0;
    const predictionConfidence = prediction.confidence;

    // Higher concentration of contribution in top features = higher confidence
    const explanationConfidence =
      concentrationRatio * 0.6 + predictionConfidence * 0.4;

    return Math.min(1, Math.max(0, explanationConfidence));
  }

  /**
   * Analyze trend for a single feature
   */
  private analyzeTrend(
    feature: string,
    values: number[],
    timestamps: Date[],
  ): TrendData {
    if (values.length < 2) {
      return {
        feature,
        values,
        timestamps,
        slope: 0,
        variance: 0,
        seasonality: 0,
        changePoints: [],
      };
    }

    // Calculate slope using simple linear regression
    const n = values.length;
    const sumX = timestamps.reduce((sum, t, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumXX = timestamps.reduce((sum, t, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate variance
    const mean = sumY / n;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;

    // Simple seasonality detection (placeholder)
    const seasonality = this.detectSeasonality(values, timestamps);

    // Change point detection (simple threshold-based)
    const changePoints = this.detectChangePoints(values, timestamps);

    return {
      feature,
      values,
      timestamps,
      slope,
      variance,
      seasonality,
      changePoints,
    };
  }

  /**
   * Calculate correlations between features
   */
  private calculateFeatureCorrelations(
    explanations: SHAPExplanation[],
  ): FeatureCorrelation[] {
    const correlations: FeatureCorrelation[] = [];
    const features = this.riskFeatures;

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const feature1 = features[i];
        const feature2 = features[j];

        const values1: number[] = [];
        const values2: number[] = [];

        for (const explanation of explanations) {
          const sv1 = explanation.shapValues.find(
            (sv) => sv.featureName === feature1,
          );
          const sv2 = explanation.shapValues.find(
            (sv) => sv.featureName === feature2,
          );

          if (sv1 && sv2) {
            values1.push(sv1.contribution);
            values2.push(sv2.contribution);
          }
        }

        if (values1.length > 2) {
          const correlation = this.calculateCorrelation(values1, values2);
          const significance = this.calculateSignificance(
            correlation,
            values1.length,
          );

          if (Math.abs(correlation) > 0.3) {
            // Only include meaningful correlations
            correlations.push({
              feature1,
              feature2,
              correlation,
              significance,
              interpretation: this.interpretCorrelation(
                feature1,
                feature2,
                correlation,
              ),
            });
          }
        }
      }
    }

    return correlations.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation),
    );
  }

  /**
   * Detect anomalies in feature patterns
   */
  private detectFeatureAnomalies(
    explanations: SHAPExplanation[],
    timeRange: [Date, Date],
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    for (const feature of this.riskFeatures) {
      const values: number[] = [];
      const timestamps: Date[] = [];

      for (const explanation of explanations) {
        const shapValue = explanation.shapValues.find(
          (sv) => sv.featureName === feature,
        );
        if (shapValue) {
          values.push(shapValue.contribution);
          timestamps.push(explanation.timestamp);
        }
      }

      if (values.length > 5) {
        const featureAnomalies = this.detectAnomaliesInSeries(
          feature,
          values,
          timestamps,
        );
        anomalies.push(...featureAnomalies);
      }
    }

    return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }

  // Helper methods

  private initializeBaselines(): void {
    // Initialize baseline values for features
    const defaultBaselines = {
      usage_frequency: 100,
      error_rate: 0.01,
      latency_p95: 200,
      security_events: 0,
      compliance_score: 0.95,
      key_age_days: 30,
      user_satisfaction: 4.0,
      request_volume: 1000,
      geographic_spread: 3,
      time_since_incident: 720, // 30 days in hours
      algorithm_strength: 0.9,
      provider_reliability: 0.99,
    };

    for (const [feature, baseline] of Object.entries(defaultBaselines)) {
      this.featureBaselines.set(feature, baseline);
    }
  }

  private getBaselineValue(keyId: string): number {
    // Return baseline prediction value (neutral risk)
    return 0.3;
  }

  private getMagnitude(value: number): 'high' | 'medium' | 'low' {
    if (value > 0.3) return 'high';
    if (value > 0.1) return 'medium';
    return 'low';
  }

  private assessRiskLevel(
    contribution: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (contribution > 0.5) return 'critical';
    if (contribution > 0.3) return 'high';
    if (contribution > 0.1) return 'medium';
    return 'low';
  }

  private calculateUrgency(contribution: number, riskLevel: string): number {
    const baseUrgency = contribution * 100;
    const multiplier =
      {
        critical: 2.0,
        high: 1.5,
        medium: 1.0,
        low: 0.5,
      }[riskLevel] || 1.0;

    return Math.min(100, baseUrgency * multiplier);
  }

  private generateMitigation(featureName: string, value: number): string {
    const mitigations = {
      usage_frequency: 'Consider implementing rate limiting or load balancing',
      error_rate: 'Review error patterns and implement additional validation',
      security_events: 'Investigate security incidents and enhance monitoring',
      key_age_days: 'Schedule regular key rotation based on age policy',
      compliance_score: 'Address compliance gaps identified in recent audits',
      latency_p95: 'Optimize key operations or consider caching strategies',
      user_satisfaction: 'Gather user feedback and address performance issues',
    };

    return (
      mitigations[featureName] ||
      'Monitor feature closely and investigate patterns'
    );
  }

  private humanizeFeatureName(featureName: string): string {
    const humanNames = {
      usage_frequency: 'Usage Frequency',
      error_rate: 'Error Rate',
      latency_p95: 'Response Latency',
      security_events: 'Security Events',
      compliance_score: 'Compliance Score',
      key_age_days: 'Key Age',
      user_satisfaction: 'User Satisfaction',
      request_volume: 'Request Volume',
      geographic_spread: 'Geographic Spread',
      time_since_incident: 'Time Since Last Incident',
      algorithm_strength: 'Algorithm Strength',
      provider_reliability: 'Provider Reliability',
    };

    return humanNames[featureName] || featureName;
  }

  private explainContribution(shapValue: SHAPValue): string {
    const direction =
      shapValue.direction === 'positive' ? 'increases' : 'decreases';
    const magnitude = shapValue.magnitude;
    const contribution = (Math.abs(shapValue.contribution) * 100).toFixed(1);

    return `${direction} risk by ${contribution}% (${magnitude} impact)`;
  }

  private getFeatureDescription(featureName: string): string {
    const descriptions = {
      usage_frequency: 'How often the key is used for cryptographic operations',
      error_rate: 'Rate of failed operations or authentication attempts',
      latency_p95: '95th percentile response time for key operations',
      security_events:
        'Number of security-related incidents involving this key',
      compliance_score: 'Compliance rating based on regulatory requirements',
      key_age_days: 'Age of the key since creation or last rotation',
      user_satisfaction:
        'User satisfaction score based on feedback and performance',
      request_volume: 'Total volume of requests processed using this key',
      geographic_spread: 'Number of different geographic regions using the key',
      time_since_incident: 'Hours since the last security incident',
      algorithm_strength: 'Cryptographic strength of the key algorithm',
      provider_reliability: 'Historical reliability score of the key provider',
    };

    return descriptions[featureName] || 'Feature description not available';
  }

  private calculateTrend(
    featureName: string,
    currentValue: number,
    baseline: number,
  ): 'increasing' | 'decreasing' | 'stable' {
    const change = (currentValue - baseline) / baseline;

    if (Math.abs(change) < this.config.sensitivityThreshold) {
      return 'stable';
    }

    return change > 0 ? 'increasing' : 'decreasing';
  }

  private calculateSensitivity(featureName: string, features: any): number {
    // Simplified sensitivity calculation
    const value = features[featureName] || 0;
    const baseline = this.featureBaselines.get(featureName) || 1;

    return Math.abs(value - baseline) / baseline;
  }

  private detectSeasonality(values: number[], timestamps: Date[]): number {
    // Simplified seasonality detection
    if (values.length < 10) return 0;

    // Look for patterns in different time periods
    const hourlyPattern = this.calculatePeriodicity(values, timestamps, 24);
    const weeklyPattern = this.calculatePeriodicity(values, timestamps, 168);

    return Math.max(hourlyPattern, weeklyPattern);
  }

  private calculatePeriodicity(
    values: number[],
    timestamps: Date[],
    period: number,
  ): number {
    // Simplified periodicity calculation
    if (values.length < period * 2) return 0;

    let correlation = 0;
    const chunks = Math.floor(values.length / period);

    for (let i = 0; i < chunks - 1; i++) {
      const chunk1 = values.slice(i * period, (i + 1) * period);
      const chunk2 = values.slice((i + 1) * period, (i + 2) * period);

      if (chunk1.length === chunk2.length) {
        correlation += this.calculateCorrelation(chunk1, chunk2);
      }
    }

    return correlation / Math.max(1, chunks - 1);
  }

  private detectChangePoints(values: number[], timestamps: Date[]): Date[] {
    const changePoints: Date[] = [];

    if (values.length < 5) return changePoints;

    // Simple change point detection using sliding window variance
    const windowSize = Math.min(5, Math.floor(values.length / 3));

    for (let i = windowSize; i < values.length - windowSize; i++) {
      const before = values.slice(i - windowSize, i);
      const after = values.slice(i, i + windowSize);

      const beforeMean = before.reduce((sum, v) => sum + v, 0) / before.length;
      const afterMean = after.reduce((sum, v) => sum + v, 0) / after.length;

      const change = Math.abs(afterMean - beforeMean);
      const threshold = this.calculateAdaptiveThreshold(values.slice(0, i));

      if (change > threshold) {
        changePoints.push(timestamps[i]);
      }
    }

    return changePoints;
  }

  private calculateAdaptiveThreshold(values: number[]): number {
    if (values.length === 0) return 0.1;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance) * 2; // 2 standard deviations
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateSignificance(
    correlation: number,
    sampleSize: number,
  ): number {
    // Simplified significance calculation
    const t =
      correlation *
      Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    return Math.abs(t);
  }

  private interpretCorrelation(
    feature1: string,
    feature2: string,
    correlation: number,
  ): string {
    const strength =
      Math.abs(correlation) > 0.7
        ? 'strong'
        : Math.abs(correlation) > 0.4
          ? 'moderate'
          : 'weak';
    const direction = correlation > 0 ? 'positive' : 'negative';

    return `${strength} ${direction} correlation between ${this.humanizeFeatureName(feature1)} and ${this.humanizeFeatureName(feature2)}`;
  }

  private detectAnomaliesInSeries(
    feature: string,
    values: number[],
    timestamps: Date[],
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    if (values.length < 5) return anomalies;

    // Calculate statistical thresholds
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Detect point anomalies (values outside 3 standard deviations)
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const deviation = Math.abs(value - mean);

      if (deviation > 3 * stdDev) {
        const anomalyScore = deviation / stdDev;

        anomalies.push({
          timestamp: timestamps[i],
          feature,
          value,
          expectedValue: mean,
          anomalyScore,
          type: 'point',
          severity:
            anomalyScore > 5 ? 'high' : anomalyScore > 4 ? 'medium' : 'low',
        });
      }
    }

    return anomalies;
  }

  private storeExplanation(keyId: string, explanation: SHAPExplanation): void {
    if (!this.explanationHistory.has(keyId)) {
      this.explanationHistory.set(keyId, []);
    }

    const history = this.explanationHistory.get(keyId)!;
    history.push(explanation);

    // Keep only recent explanations
    const maxHistory = 100;
    if (history.length > maxHistory) {
      this.explanationHistory.set(keyId, history.slice(-maxHistory));
    }
  }

  private getExplanationsInRange(
    keyId: string,
    timeRange: [Date, Date],
  ): SHAPExplanation[] {
    const history = this.explanationHistory.get(keyId) || [];

    return history.filter(
      (explanation) =>
        explanation.timestamp >= timeRange[0] &&
        explanation.timestamp <= timeRange[1],
    );
  }

  private addAuditEntry(entry: AuditEntry): void {
    this.auditLog.push(entry);

    // Clean up old audit entries
    const cutoffDate = new Date(
      Date.now() - this.config.auditRetention * 24 * 60 * 60 * 1000,
    );
    this.auditLog = this.auditLog.filter((e) => e.timestamp >= cutoffDate);
  }

  private sanitizeFeatures(features: any): any {
    // Remove sensitive information from features for audit logging
    const sanitized = { ...features };
    delete sanitized.api_key;
    delete sanitized.secret;
    delete sanitized.private_key;
    return sanitized;
  }

  /**
   * Get explanation history for a key
   */
  getExplanationHistory(keyId: string, limit?: number): SHAPExplanation[] {
    const history = this.explanationHistory.get(keyId) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get audit log
   */
  getAuditLog(limit?: number): AuditEntry[] {
    return limit ? this.auditLog.slice(-limit) : [...this.auditLog];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ExplainerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Configuration updated', { config: this.config });
    this.emit('config_updated', this.config);
  }

  /**
   * Export state for persistence
   */
  exportState(): any {
    return {
      config: this.config,
      explanationHistory: Object.fromEntries(
        Array.from(this.explanationHistory.entries()).map(([key, history]) => [
          key,
          history.slice(-10), // Keep recent explanations
        ]),
      ),
      featureBaselines: Object.fromEntries(this.featureBaselines),
      auditLog: this.auditLog.slice(-100), // Keep recent audit entries
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: any): void {
    this.config = state.config;
    this.explanationHistory = new Map(Object.entries(state.explanationHistory));
    this.featureBaselines = new Map(Object.entries(state.featureBaselines));
    this.auditLog = state.auditLog;

    logger.info('State imported', {
      explanationHistoryKeys: this.explanationHistory.size,
      featureBaselines: this.featureBaselines.size,
      auditLogEntries: this.auditLog.length,
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down KeyRiskMLExplainer');

    // Clear caches
    this.shapCache.clear();
    this.coalitionCache.clear();

    this.removeAllListeners();
    logger.info('KeyRiskMLExplainer shutdown complete');
  }
}

export default KeyRiskMLExplainer;
