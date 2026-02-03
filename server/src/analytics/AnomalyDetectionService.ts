/**
 * Anomaly Detection Service
 *
 * AI-powered anomaly detection for security, compliance, and operational insights.
 * Supports multiple detection algorithms and real-time monitoring.
 *
 * SOC 2 Controls: CC7.2 (Incident Detection), CC4.1 (Monitoring)
 *
 * @module analytics/AnomalyDetectionService
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type AnomalyType = 'statistical' | 'behavioral' | 'sequence' | 'volume' | 'pattern';
export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type SuggestedAction = 'alert' | 'review' | 'block' | 'investigate' | 'monitor';

export interface AnomalyDetectionResult {
  id: string;
  timestamp: string;
  tenantId: string;
  anomalyScore: number;
  confidence: number;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  suggestedAction: SuggestedAction;
  details: AnomalyDetails;
  governanceVerdict: GovernanceVerdict;
}

export interface AnomalyDetails {
  feature: string;
  observedValue: number;
  expectedValue: number;
  threshold: number;
  deviation: number;
  context: Record<string, unknown>;
  relatedEntities: string[];
}

export interface DataPoint {
  timestamp: number;
  feature: string;
  value: number;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface AnomalyDetectorConfig {
  /** Sensitivity (0-1, higher = more sensitive) */
  sensitivity: number;
  /** Minimum anomaly score to report */
  minAnomalyScore: number;
  /** Window size for time-series analysis */
  windowSize: number;
  /** Enable real-time detection */
  realTimeEnabled: boolean;
  /** Batch size for batch detection */
  batchSize: number;
}

export interface DetectorStats {
  totalAnalyzed: number;
  anomaliesDetected: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<AnomalySeverity, number>;
  averageConfidence: number;
  lastDetectionAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'anomaly-detection-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'AnomalyDetectionService',
  };
}

function calculateSeverity(anomalyScore: number): AnomalySeverity {
  if (anomalyScore >= 0.9) return 'critical';
  if (anomalyScore >= 0.7) return 'high';
  if (anomalyScore >= 0.5) return 'medium';
  if (anomalyScore >= 0.3) return 'low';
  return 'info';
}

function calculateSuggestedAction(severity: AnomalySeverity, anomalyType: AnomalyType): SuggestedAction {
  if (severity === 'critical') return 'block';
  if (severity === 'high') return 'investigate';
  if (severity === 'medium') return 'review';
  if (anomalyType === 'behavioral') return 'review';
  return 'monitor';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  sensitivity: 0.7,
  minAnomalyScore: 0.3,
  windowSize: 100,
  realTimeEnabled: true,
  batchSize: 1000,
};

// ============================================================================
// Statistical Anomaly Detector
// ============================================================================

class StatisticalAnomalyDetector {
  private windowData: Map<string, number[]> = new Map();
  private windowSize: number;

  constructor(windowSize: number) {
    this.windowSize = windowSize;
  }

  /**
   * Detect statistical anomalies using z-score
   */
  detect(dataPoint: DataPoint, sensitivity: number): { score: number; deviation: number; expected: number } {
    const key = `${dataPoint.tenantId}:${dataPoint.feature}`;
    let window = this.windowData.get(key) || [];

    // Add to window
    window.push(dataPoint.value);
    if (window.length > this.windowSize) {
      window = window.slice(-this.windowSize);
    }
    this.windowData.set(key, window);

    // Need minimum data for statistics
    if (window.length < 10) {
      return { score: 0, deviation: 0, expected: dataPoint.value };
    }

    // Calculate statistics
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return { score: 0, deviation: 0, expected: mean };
    }

    // Calculate z-score
    const zScore = Math.abs((dataPoint.value - mean) / stdDev);

    // Convert to anomaly score (0-1) with sensitivity adjustment
    const baseThreshold = 3 - (2 * sensitivity); // 1-3 based on sensitivity
    const score = Math.min(1, Math.max(0, (zScore - baseThreshold) / 2));

    return {
      score,
      deviation: zScore,
      expected: mean,
    };
  }

  /**
   * Clear window data for a tenant
   */
  clearTenant(tenantId: string): void {
    for (const key of this.windowData.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.windowData.delete(key);
      }
    }
  }
}

// ============================================================================
// Isolation Forest (Simplified)
// ============================================================================

class IsolationForestDetector {
  private trees: number = 100;
  private sampleSize: number = 256;

  /**
   * Detect anomalies using isolation forest principles
   * (Simplified implementation - in production use ML library)
   */
  detect(features: number[], baseline: number[][]): number {
    if (baseline.length < this.sampleSize) {
      return 0;
    }

    // Calculate average path length for the data point
    let totalPathLength = 0;

    for (let t = 0; t < this.trees; t++) {
      // Sample baseline
      const sample = this.randomSample(baseline, this.sampleSize);
      totalPathLength += this.calculatePathLength(features, sample, 0);
    }

    const avgPathLength = totalPathLength / this.trees;

    // Normalize score (shorter path = more anomalous)
    const c = this.averagePathLength(this.sampleSize);
    const score = Math.pow(2, -avgPathLength / c);

    return score;
  }

  private calculatePathLength(point: number[], data: number[][], depth: number): number {
    if (data.length <= 1 || depth >= 10) {
      return depth + this.averagePathLength(data.length);
    }

    // Random feature and split point
    const featureIdx = Math.floor(Math.random() * point.length);
    const values = data.map(d => d[featureIdx]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      return depth + this.averagePathLength(data.length);
    }

    const splitValue = min + Math.random() * (max - min);

    // Split data
    const left = data.filter(d => d[featureIdx] < splitValue);
    const right = data.filter(d => d[featureIdx] >= splitValue);

    // Follow path
    if (point[featureIdx] < splitValue) {
      return this.calculatePathLength(point, left, depth + 1);
    } else {
      return this.calculatePathLength(point, right, depth + 1);
    }
  }

  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  private randomSample<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }
}

// ============================================================================
// User Behavior Analyzer
// ============================================================================

interface UserProfile {
  userId: string;
  tenantId: string;
  actionCounts: Map<string, number>;
  timePatterns: Map<number, number>;
  locationHistory: Set<string>;
  averageSessionDuration: number;
  lastActivity: number;
}

class UserBehaviorAnalyzer {
  private profiles: Map<string, UserProfile> = new Map();
  private readonly decayFactor = 0.95;

  /**
   * Update user profile with new activity
   */
  updateProfile(
    userId: string,
    tenantId: string,
    action: string,
    metadata: Record<string, unknown>
  ): void {
    const key = `${tenantId}:${userId}`;
    let profile = this.profiles.get(key);

    if (!profile) {
      profile = {
        userId,
        tenantId,
        actionCounts: new Map(),
        timePatterns: new Map(),
        locationHistory: new Set(),
        averageSessionDuration: 0,
        lastActivity: Date.now(),
      };
      this.profiles.set(key, profile);
    }

    // Update action counts
    const currentCount = profile.actionCounts.get(action) || 0;
    profile.actionCounts.set(action, currentCount + 1);

    // Update time pattern
    const hour = new Date().getHours();
    const hourCount = profile.timePatterns.get(hour) || 0;
    profile.timePatterns.set(hour, hourCount + 1);

    // Update location if available
    if (metadata.location) {
      profile.locationHistory.add(metadata.location as string);
    }

    profile.lastActivity = Date.now();
  }

  /**
   * Analyze if current activity is anomalous for user
   */
  analyzeActivity(
    userId: string,
    tenantId: string,
    action: string,
    metadata: Record<string, unknown>
  ): { score: number; reasons: string[] } {
    const key = `${tenantId}:${userId}`;
    const profile = this.profiles.get(key);

    if (!profile) {
      // New user, can't determine anomaly
      return { score: 0, reasons: ['New user profile'] };
    }

    const reasons: string[] = [];
    let totalScore = 0;
    let factors = 0;

    // Check action frequency
    const actionCount = profile.actionCounts.get(action) || 0;
    const totalActions = Array.from(profile.actionCounts.values())
      .reduce((a, b) => a + b, 0);

    if (totalActions > 10) {
      const expectedFrequency = actionCount / totalActions;
      if (expectedFrequency < 0.01) {
        totalScore += 0.5;
        reasons.push('Rare action for this user');
      }
      factors++;
    }

    // Check time pattern
    const hour = new Date().getHours();
    const hourCount = profile.timePatterns.get(hour) || 0;
    const totalHourCounts = Array.from(profile.timePatterns.values())
      .reduce((a, b) => a + b, 0);

    if (totalHourCounts > 20) {
      const expectedHourFrequency = hourCount / totalHourCounts;
      if (expectedHourFrequency < 0.02) {
        totalScore += 0.4;
        reasons.push('Unusual time of activity');
      }
      factors++;
    }

    // Check location
    if (metadata.location && profile.locationHistory.size > 0) {
      if (!profile.locationHistory.has(metadata.location as string)) {
        totalScore += 0.6;
        reasons.push('New location detected');
      }
      factors++;
    }

    // Check activity gap
    const hoursSinceLastActivity = (Date.now() - profile.lastActivity) / (1000 * 60 * 60);
    if (hoursSinceLastActivity > 720) { // 30 days
      totalScore += 0.3;
      reasons.push('Long inactivity period');
      factors++;
    }

    const score = factors > 0 ? totalScore / factors : 0;
    return { score: Math.min(1, score), reasons };
  }
}

// ============================================================================
// Anomaly Detection Service
// ============================================================================

export class AnomalyDetectionService extends EventEmitter {
  private config: AnomalyDetectorConfig;
  private statisticalDetector: StatisticalAnomalyDetector;
  private isolationForest: IsolationForestDetector;
  private behaviorAnalyzer: UserBehaviorAnalyzer;
  private baselineData: Map<string, number[][]> = new Map();
  private stats: DetectorStats;

  constructor(config?: Partial<AnomalyDetectorConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statisticalDetector = new StatisticalAnomalyDetector(this.config.windowSize);
    this.isolationForest = new IsolationForestDetector();
    this.behaviorAnalyzer = new UserBehaviorAnalyzer();
    this.stats = {
      totalAnalyzed: 0,
      anomaliesDetected: 0,
      byType: {
        statistical: 0,
        behavioral: 0,
        sequence: 0,
        volume: 0,
        pattern: 0,
      },
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      averageConfidence: 0,
      lastDetectionAt: null,
    };

    logger.info({ config: this.config }, 'AnomalyDetectionService initialized');
  }

  /**
   * Analyze a single data point for anomalies
   */
  async analyzeDataPoint(dataPoint: DataPoint): Promise<DataEnvelope<AnomalyDetectionResult | null>> {
    this.stats.totalAnalyzed++;

    // Statistical anomaly detection
    const statResult = this.statisticalDetector.detect(dataPoint, this.config.sensitivity);

    if (statResult.score < this.config.minAnomalyScore) {
      return createDataEnvelope(null, {
        source: 'AnomalyDetectionService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'No anomaly detected'),
        classification: DataClassification.INTERNAL,
      });
    }

    const severity = calculateSeverity(statResult.score);
    const action = calculateSuggestedAction(severity, 'statistical');

    const result: AnomalyDetectionResult = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      tenantId: dataPoint.tenantId,
      anomalyScore: statResult.score,
      confidence: Math.min(0.95, 0.5 + (statResult.deviation / 10)),
      anomalyType: 'statistical',
      severity,
      suggestedAction: action,
      details: {
        feature: dataPoint.feature,
        observedValue: dataPoint.value,
        expectedValue: statResult.expected,
        threshold: this.config.minAnomalyScore,
        deviation: statResult.deviation,
        context: dataPoint.metadata || {},
        relatedEntities: [],
      },
      governanceVerdict: createVerdict(
        severity === 'critical' || severity === 'high' ? GovernanceResult.FLAG : GovernanceResult.ALLOW,
        `Statistical anomaly detected: ${severity} severity`
      ),
    };

    this.recordAnomaly(result);
    this.emit('anomaly:detected', result);

    logger.info(
      {
        anomalyId: result.id,
        tenantId: result.tenantId,
        anomalyType: result.anomalyType,
        severity: result.severity,
        score: result.anomalyScore,
      },
      'Anomaly detected'
    );

    return createDataEnvelope(result, {
      source: 'AnomalyDetectionService',
      governanceVerdict: result.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Analyze user behavior for anomalies
   */
  async analyzeUserBehavior(
    userId: string,
    tenantId: string,
    action: string,
    metadata: Record<string, unknown>
  ): Promise<DataEnvelope<AnomalyDetectionResult | null>> {
    this.stats.totalAnalyzed++;

    // Update profile
    this.behaviorAnalyzer.updateProfile(userId, tenantId, action, metadata);

    // Analyze activity
    const analysis = this.behaviorAnalyzer.analyzeActivity(userId, tenantId, action, metadata);

    if (analysis.score < this.config.minAnomalyScore) {
      return createDataEnvelope(null, {
        source: 'AnomalyDetectionService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Normal behavior'),
        classification: DataClassification.INTERNAL,
      });
    }

    const severity = calculateSeverity(analysis.score);
    const suggestedAction = calculateSuggestedAction(severity, 'behavioral');

    const result: AnomalyDetectionResult = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      tenantId,
      anomalyScore: analysis.score,
      confidence: 0.7, // Behavioral analysis has moderate confidence
      anomalyType: 'behavioral',
      severity,
      suggestedAction,
      details: {
        feature: 'user_behavior',
        observedValue: analysis.score,
        expectedValue: 0,
        threshold: this.config.minAnomalyScore,
        deviation: analysis.score,
        context: {
          userId,
          action,
          reasons: analysis.reasons,
          ...metadata,
        },
        relatedEntities: [userId],
      },
      governanceVerdict: createVerdict(
        severity === 'critical' ? GovernanceResult.DENY :
        severity === 'high' ? GovernanceResult.FLAG :
        GovernanceResult.ALLOW,
        `Behavioral anomaly: ${analysis.reasons.join(', ')}`
      ),
    };

    this.recordAnomaly(result);
    this.emit('anomaly:detected', result);

    return createDataEnvelope(result, {
      source: 'AnomalyDetectionService',
      governanceVerdict: result.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Batch analyze multiple data points
   */
  async analyzeBatch(
    dataPoints: DataPoint[]
  ): Promise<DataEnvelope<AnomalyDetectionResult[]>> {
    const results: AnomalyDetectionResult[] = [];

    for (const point of dataPoints) {
      const result = await this.analyzeDataPoint(point);
      if (result.data) {
        results.push(result.data);
      }
    }

    return createDataEnvelope(results, {
      source: 'AnomalyDetectionService',
      governanceVerdict: createVerdict(
        GovernanceResult.ALLOW,
        `Batch analysis complete: ${results.length} anomalies in ${dataPoints.length} points`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Add baseline data for isolation forest
   */
  addBaseline(tenantId: string, features: number[][]): void {
    const existing = this.baselineData.get(tenantId) || [];
    this.baselineData.set(tenantId, [...existing, ...features].slice(-10000));
  }

  /**
   * Get detection statistics
   */
  getStats(): DataEnvelope<DetectorStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'AnomalyDetectionService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Clear tenant data
   */
  clearTenant(tenantId: string): void {
    this.statisticalDetector.clearTenant(tenantId);
    this.baselineData.delete(tenantId);
    logger.info({ tenantId }, 'Tenant data cleared from anomaly detector');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private recordAnomaly(result: AnomalyDetectionResult): void {
    this.stats.anomaliesDetected++;
    this.stats.byType[result.anomalyType]++;
    this.stats.bySeverity[result.severity]++;
    this.stats.lastDetectionAt = result.timestamp;

    // Update average confidence
    const n = this.stats.anomaliesDetected;
    this.stats.averageConfidence =
      ((this.stats.averageConfidence * (n - 1)) + result.confidence) / n;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: AnomalyDetectionService | null = null;

export function getAnomalyDetectionService(
  config?: Partial<AnomalyDetectorConfig>
): AnomalyDetectionService {
  if (!instance) {
    instance = new AnomalyDetectionService(config);
  }
  return instance;
}

export default AnomalyDetectionService;
