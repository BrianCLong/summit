/**
 * FracturePredictor - Predicts future fracture points using Monte Carlo simulation
 *
 * Uses historical patterns and current system state to forecast when
 * systems will enter critical instability.
 */

import {
  FracturePointModel,
  FractureSeverity,
  TriggeringFactor,
} from '../models/FracturePoint.js';
import { SystemPhaseModel, PhaseState, StabilityMetric } from '../models/SystemPhase.js';
import { TimeSeriesData } from '../TemporalFractureEngine.js';

export interface FracturePredictorConfig {
  simulationCount: number;
  horizonHours: number;
}

interface SimulationResult {
  timestamp: Date;
  fractureOccurred: boolean;
  severity: FractureSeverity;
  triggeringFactors: TriggeringFactor[];
}

export class FracturePredictor {
  private config: FracturePredictorConfig;

  constructor(config: FracturePredictorConfig) {
    this.config = config;
  }

  /**
   * Predict fracture points
   */
  async predict(
    systemId: string,
    historicalData: TimeSeriesData[],
    currentPhase: SystemPhaseModel,
    stabilityMetric: StabilityMetric,
    horizonHours?: number
  ): Promise<FracturePointModel[]> {
    const horizon = horizonHours || this.config.horizonHours;

    // Extract temporal patterns from historical data
    const patterns = this.extractPatterns(historicalData);

    // Run Monte Carlo simulations
    const simulations = await this.runSimulations(
      historicalData,
      currentPhase,
      stabilityMetric,
      patterns,
      horizon
    );

    // Aggregate simulation results
    const fracturePoints = this.aggregateSimulations(
      systemId,
      simulations,
      currentPhase,
      stabilityMetric
    );

    return fracturePoints;
  }

  /**
   * Extract temporal patterns from historical data
   */
  private extractPatterns(data: TimeSeriesData[]): {
    volatility: number;
    trend: number;
    cyclicality: number;
  } {
    if (data.length < 10) {
      return { volatility: 0.1, trend: 0, cyclicality: 0 };
    }

    const values = data.map((d) => d.value);

    // Compute volatility (standard deviation)
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      values.length;
    const volatility = Math.sqrt(variance);

    // Compute trend (linear regression slope)
    const trend = this.computeTrend(data);

    // Compute cyclicality (autocorrelation)
    const cyclicality = this.computeAutocorrelation(values, 1);

    return { volatility, trend, cyclicality };
  }

  /**
   * Run Monte Carlo simulations
   */
  private async runSimulations(
    historicalData: TimeSeriesData[],
    currentPhase: SystemPhaseModel,
    stabilityMetric: StabilityMetric,
    patterns: { volatility: number; trend: number; cyclicality: number },
    horizonHours: number
  ): Promise<SimulationResult[]> {
    const simulations: SimulationResult[] = [];

    for (let i = 0; i < this.config.simulationCount; i++) {
      const result = this.simulateTrajectory(
        historicalData,
        currentPhase,
        stabilityMetric,
        patterns,
        horizonHours
      );

      simulations.push(result);
    }

    return simulations;
  }

  /**
   * Simulate a single trajectory
   */
  private simulateTrajectory(
    historicalData: TimeSeriesData[],
    currentPhase: SystemPhaseModel,
    stabilityMetric: StabilityMetric,
    patterns: { volatility: number; trend: number; cyclicality: number },
    horizonHours: number
  ): SimulationResult {
    const now = new Date();
    let currentValue =
      historicalData.length > 0
        ? historicalData[historicalData.length - 1].value
        : 0;
    let currentStability = stabilityMetric.stabilityScore;

    // Simulate forward in time
    const stepsPerHour = 12; // 5-minute intervals
    const totalSteps = horizonHours * stepsPerHour;

    for (let step = 0; step < totalSteps; step++) {
      // Add random walk with drift
      const drift = patterns.trend;
      const randomShock =
        this.randomNormal(0, patterns.volatility) * (1 - patterns.cyclicality);

      currentValue = currentValue + drift + randomShock;

      // Update stability (degrades if phase is unstable)
      if (
        currentPhase.current === PhaseState.UNSTABLE ||
        currentPhase.current === PhaseState.CRITICAL
      ) {
        currentStability *= 0.99; // Decay
      } else if (currentPhase.current === PhaseState.RECOVERING) {
        currentStability = Math.min(1, currentStability * 1.01); // Improve
      }

      // Check for fracture
      if (currentStability < 0.2 || currentValue < 0 || currentValue > 100) {
        const fractureTime = new Date(
          now.getTime() + step * 5 * 60 * 1000
        );

        return {
          timestamp: fractureTime,
          fractureOccurred: true,
          severity: this.determineSeverity(currentStability, currentValue),
          triggeringFactors: this.identifyTriggers(
            currentValue,
            currentStability
          ),
        };
      }
    }

    // No fracture in horizon
    return {
      timestamp: new Date(now.getTime() + horizonHours * 60 * 60 * 1000),
      fractureOccurred: false,
      severity: FractureSeverity.LOW,
      triggeringFactors: [],
    };
  }

  /**
   * Aggregate simulation results
   */
  private aggregateSimulations(
    systemId: string,
    simulations: SimulationResult[],
    currentPhase: SystemPhaseModel,
    stabilityMetric: StabilityMetric
  ): FracturePointModel[] {
    // Group fractures by time window (1-hour buckets)
    const buckets = new Map<number, SimulationResult[]>();

    for (const sim of simulations) {
      if (!sim.fractureOccurred) continue;

      const bucket = Math.floor(sim.timestamp.getTime() / (60 * 60 * 1000));
      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket)!.push(sim);
    }

    // Create fracture points from buckets with sufficient probability
    const fracturePoints: FracturePointModel[] = [];
    const now = new Date();

    for (const [bucket, sims] of buckets.entries()) {
      const probability = sims.length / this.config.simulationCount;

      if (probability < 0.1) continue; // Skip low-probability fractures

      const avgTime = new Date(bucket * 60 * 60 * 1000);
      const leadTimeHours = (avgTime.getTime() - now.getTime()) / (60 * 60 * 1000);

      // Determine severity by majority vote
      const severityCounts = new Map<FractureSeverity, number>();
      sims.forEach((s) => {
        severityCounts.set(s.severity, (severityCounts.get(s.severity) || 0) + 1);
      });

      const severity = Array.from(severityCounts.entries()).reduce((max, entry) =>
        entry[1] > max[1] ? entry : max
      )[0];

      // Aggregate triggering factors
      const factorMap = new Map<string, TriggeringFactor>();
      sims.forEach((s) => {
        s.triggeringFactors.forEach((f) => {
          if (factorMap.has(f.name)) {
            const existing = factorMap.get(f.name)!;
            existing.contribution += f.contribution;
          } else {
            factorMap.set(f.name, { ...f });
          }
        });
      });

      const triggeringFactors = Array.from(factorMap.values())
        .map((f) => ({
          ...f,
          contribution: f.contribution / sims.length,
        }))
        .sort((a, b) => b.contribution - a.contribution);

      fracturePoints.push(
        new FracturePointModel({
          id: `fracture-${systemId}-${bucket}`,
          systemId,
          predictedTime: avgTime,
          detectedAt: now,
          confidence: probability,
          severity,
          triggeringFactors,
          leadTimeHours,
          estimatedImpact: {
            affectedSystems: [systemId],
            estimatedDowntimeMinutes: this.estimateDowntime(severity),
            estimatedCostUSD: this.estimateCost(severity),
            userImpact: this.estimateUserImpact(severity),
            dataLossRisk: this.estimateDataLossRisk(severity),
          },
        })
      );
    }

    // Sort by predicted time
    return fracturePoints.sort(
      (a, b) => a.predictedTime.getTime() - b.predictedTime.getTime()
    );
  }

  /**
   * Determine fracture severity
   */
  private determineSeverity(
    stability: number,
    value: number
  ): FractureSeverity {
    if (stability < 0.1 || value < -10 || value > 110) {
      return FractureSeverity.CRITICAL;
    } else if (stability < 0.2 || value < 0 || value > 100) {
      return FractureSeverity.HIGH;
    } else if (stability < 0.4) {
      return FractureSeverity.MEDIUM;
    } else {
      return FractureSeverity.LOW;
    }
  }

  /**
   * Identify triggering factors
   */
  private identifyTriggers(
    value: number,
    stability: number
  ): TriggeringFactor[] {
    const triggers: TriggeringFactor[] = [];

    if (stability < 0.3) {
      triggers.push({
        name: 'stability_degradation',
        contribution: 1 - stability,
        currentValue: stability,
        thresholdValue: 0.7,
        trend: 'decreasing',
      });
    }

    if (value < 10 || value > 90) {
      triggers.push({
        name: 'extreme_value',
        contribution: Math.abs(value - 50) / 50,
        currentValue: value,
        thresholdValue: 50,
        trend: value > 50 ? 'increasing' : 'decreasing',
      });
    }

    return triggers;
  }

  /**
   * Utility: Compute trend (linear regression slope)
   */
  private computeTrend(data: TimeSeriesData[]): number {
    const n = data.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    data.forEach((d, i) => {
      sumX += i;
      sumY += d.value;
      sumXY += i * d.value;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Utility: Compute autocorrelation
   */
  private computeAutocorrelation(data: number[], lag: number): number {
    const n = data.length;
    if (n < lag + 1) return 0;

    const mean = data.reduce((sum, v) => sum + v, 0) / n;

    let num = 0;
    let denom = 0;

    for (let i = 0; i < n - lag; i++) {
      num += (data[i] - mean) * (data[i + lag] - mean);
    }

    for (let i = 0; i < n; i++) {
      denom += Math.pow(data[i] - mean, 2);
    }

    return denom !== 0 ? num / denom : 0;
  }

  /**
   * Utility: Random normal (Box-Muller transform)
   */
  private randomNormal(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Estimate downtime in minutes
   */
  private estimateDowntime(severity: FractureSeverity): number {
    const estimates = {
      [FractureSeverity.LOW]: 5,
      [FractureSeverity.MEDIUM]: 30,
      [FractureSeverity.HIGH]: 120,
      [FractureSeverity.CRITICAL]: 480,
    };
    return estimates[severity];
  }

  /**
   * Estimate cost in USD
   */
  private estimateCost(severity: FractureSeverity): number {
    const estimates = {
      [FractureSeverity.LOW]: 1000,
      [FractureSeverity.MEDIUM]: 10000,
      [FractureSeverity.HIGH]: 100000,
      [FractureSeverity.CRITICAL]: 500000,
    };
    return estimates[severity];
  }

  /**
   * Estimate user impact
   */
  private estimateUserImpact(
    severity: FractureSeverity
  ): 'low' | 'medium' | 'high' | 'critical' {
    const mapping = {
      [FractureSeverity.LOW]: 'low' as const,
      [FractureSeverity.MEDIUM]: 'medium' as const,
      [FractureSeverity.HIGH]: 'high' as const,
      [FractureSeverity.CRITICAL]: 'critical' as const,
    };
    return mapping[severity];
  }

  /**
   * Estimate data loss risk
   */
  private estimateDataLossRisk(severity: FractureSeverity): number {
    const risks = {
      [FractureSeverity.LOW]: 0.01,
      [FractureSeverity.MEDIUM]: 0.05,
      [FractureSeverity.HIGH]: 0.2,
      [FractureSeverity.CRITICAL]: 0.5,
    };
    return risks[severity];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FracturePredictorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): FracturePredictorConfig {
    return { ...this.config };
  }
}
