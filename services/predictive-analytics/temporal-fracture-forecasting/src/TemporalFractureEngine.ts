/**
 * TemporalFractureEngine - Core engine for fracture detection and prediction
 *
 * Orchestrates the various algorithms to detect phase transitions,
 * analyze stability, predict fractures, and generate recovery plans.
 */

import { PhaseTransitionDetector } from './algorithms/PhaseTransitionDetector.js';
import { StabilityAnalyzer } from './algorithms/StabilityAnalyzer.js';
import { FracturePredictor } from './algorithms/FracturePredictor.js';
import { RecoveryRecommender } from './algorithms/RecoveryRecommender.js';
import {
  FracturePointModel,
  FractureSeverity,
} from './models/FracturePoint.js';
import { SystemPhaseModel, PhaseState } from './models/SystemPhase.js';
import { RecoveryPlanModel, Urgency } from './models/RecoveryPlan.js';

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface MetricsConfig {
  metricNames: string[];
  windowSizeMinutes: number;
  samplingIntervalSeconds: number;
}

export interface FractureMap {
  systemId: string;
  currentPhase: SystemPhaseModel;
  stabilityScore: number;
  predictedFractures: FracturePointModel[];
  recommendations: RecoveryPlanModel[];
  lastUpdated: Date;
}

export class TemporalFractureEngine {
  private phaseDetector: PhaseTransitionDetector;
  private stabilityAnalyzer: StabilityAnalyzer;
  private fracturePredictor: FracturePredictor;
  private recoveryRecommender: RecoveryRecommender;

  constructor() {
    this.phaseDetector = new PhaseTransitionDetector({
      windowSize: 30,
      threshold: 0.05,
    });

    this.stabilityAnalyzer = new StabilityAnalyzer({
      embeddingDimension: 3,
      timeDelay: 1,
    });

    this.fracturePredictor = new FracturePredictor({
      simulationCount: 1000,
      horizonHours: 72,
    });

    this.recoveryRecommender = new RecoveryRecommender();
  }

  /**
   * Generate complete fracture map for a system
   */
  async generateFractureMap(
    systemId: string,
    metricsData: TimeSeriesData[]
  ): Promise<FractureMap> {
    // Step 1: Detect current phase
    const phaseTransitions = this.phaseDetector.detect(metricsData);
    const currentPhase = this.determineCurrentPhase(
      systemId,
      phaseTransitions,
      metricsData
    );

    // Step 2: Analyze stability
    const stabilityMetric = this.stabilityAnalyzer.analyze(metricsData);

    // Update phase with stability info
    currentPhase.stability = {
      ...stabilityMetric,
      systemId,
    };

    // Step 3: Predict fractures
    const predictedFractures = await this.fracturePredictor.predict(
      systemId,
      metricsData,
      currentPhase,
      stabilityMetric
    );

    // Step 4: Generate recovery plans for each fracture
    const recommendations = predictedFractures.map((fracture) =>
      this.recoveryRecommender.generatePlan(fracture, currentPhase)
    );

    return {
      systemId,
      currentPhase,
      stabilityScore: stabilityMetric.stabilityScore,
      predictedFractures,
      recommendations,
      lastUpdated: new Date(),
    };
  }

  /**
   * Predict fractures for a specific horizon
   */
  async predictFractures(
    systemId: string,
    metricsData: TimeSeriesData[],
    horizonHours: number,
    confidenceThreshold: number = 0.7
  ): Promise<FracturePointModel[]> {
    const stabilityMetric = this.stabilityAnalyzer.analyze(metricsData);
    const phaseTransitions = this.phaseDetector.detect(metricsData);
    const currentPhase = this.determineCurrentPhase(
      systemId,
      phaseTransitions,
      metricsData
    );

    currentPhase.stability = {
      ...stabilityMetric,
      systemId,
    };

    const fractures = await this.fracturePredictor.predict(
      systemId,
      metricsData,
      currentPhase,
      stabilityMetric,
      horizonHours
    );

    // Filter by confidence threshold
    return fractures.filter((f) => f.confidence >= confidenceThreshold);
  }

  /**
   * Get current system stability
   */
  getSystemStability(metricsData: TimeSeriesData[]) {
    return this.stabilityAnalyzer.analyze(metricsData);
  }

  /**
   * Generate recovery plan for a fracture point
   */
  generateRecoveryPlan(
    fracturePoint: FracturePointModel,
    currentPhase: SystemPhaseModel
  ): RecoveryPlanModel {
    return this.recoveryRecommender.generatePlan(fracturePoint, currentPhase);
  }

  /**
   * Determine current phase from transitions and data
   */
  private determineCurrentPhase(
    systemId: string,
    transitions: any[],
    metricsData: TimeSeriesData[]
  ): SystemPhaseModel {
    let currentPhase = PhaseState.STABLE;
    let lastTransitionTime = metricsData[0]?.timestamp || new Date();

    if (transitions.length > 0) {
      const lastTransition = transitions[transitions.length - 1];
      currentPhase = lastTransition.toPhase;
      lastTransitionTime = lastTransition.timestamp;
    }

    const now = new Date();
    const duration = Math.floor(
      (now.getTime() - lastTransitionTime.getTime()) / 1000
    );

    // Calculate trends from recent data
    const trends = this.calculateTrends(metricsData);

    return new SystemPhaseModel({
      systemId,
      current: currentPhase,
      duration,
      stability: {
        timestamp: now,
        systemId,
        lyapunovExponent: 0,
        stabilityScore: 0.5,
        isStable: true,
      },
      trends,
      lastTransition:
        transitions.length > 0 ? transitions[transitions.length - 1] : undefined,
    });
  }

  /**
   * Calculate metric trends
   */
  private calculateTrends(metricsData: TimeSeriesData[]): any[] {
    if (metricsData.length < 10) return [];

    const recentData = metricsData.slice(-20);
    const olderData = metricsData.slice(-40, -20);

    const recentMean =
      recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
    const olderMean =
      olderData.reduce((sum, d) => sum + d.value, 0) / olderData.length;

    const percentChange =
      olderMean !== 0 ? ((recentMean - olderMean) / olderMean) * 100 : 0;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (percentChange > 5) direction = 'up';
    else if (percentChange < -5) direction = 'down';

    return [
      {
        metric: 'value',
        direction,
        magnitude: Math.abs(percentChange),
        confidence: 0.8,
      },
    ];
  }

  /**
   * Monitor system continuously
   */
  async startMonitoring(
    systemId: string,
    metricsConfig: MetricsConfig,
    onFractureDetected: (fracture: FracturePointModel) => void
  ): Promise<() => void> {
    // This would integrate with a real metrics source (TimescaleDB, Prometheus, etc.)
    // For now, return a cleanup function
    const interval = setInterval(async () => {
      // In real implementation:
      // 1. Fetch latest metrics from TimescaleDB
      // 2. Run fracture detection
      // 3. Call onFractureDetected if new fractures found
    }, metricsConfig.samplingIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }

  /**
   * Validate metrics data
   */
  validateMetricsData(data: TimeSeriesData[]): boolean {
    if (!data || data.length === 0) return false;

    // Check for required fields
    return data.every(
      (d) =>
        d.timestamp instanceof Date &&
        !isNaN(d.timestamp.getTime()) &&
        typeof d.value === 'number' &&
        !isNaN(d.value)
    );
  }

  /**
   * Get algorithm configuration
   */
  getConfiguration() {
    return {
      phaseDetection: {
        windowSize: 30,
        threshold: 0.05,
      },
      stabilityAnalysis: {
        embeddingDimension: 3,
        timeDelay: 1,
      },
      fracturePrediction: {
        simulationCount: 1000,
        horizonHours: 72,
      },
    };
  }

  /**
   * Update algorithm configuration
   */
  updateConfiguration(config: Partial<any>): void {
    // Allow dynamic configuration updates
    if (config.phaseDetection) {
      this.phaseDetector = new PhaseTransitionDetector(config.phaseDetection);
    }

    if (config.stabilityAnalysis) {
      this.stabilityAnalyzer = new StabilityAnalyzer(config.stabilityAnalysis);
    }

    if (config.fracturePrediction) {
      this.fracturePredictor = new FracturePredictor(config.fracturePrediction);
    }
  }
}
