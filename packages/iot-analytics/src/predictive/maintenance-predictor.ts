/**
 * Predictive Maintenance
 * Predict equipment failures and maintenance needs
 */

import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { SensorReading } from '@intelgraph/sensor-data';

const logger = pino({ name: 'maintenance-predictor' });

export interface MaintenancePrediction {
  deviceId: string;
  predictionType: 'failure' | 'degradation' | 'maintenance-due';
  confidence: number;
  estimatedTimeToEvent: number; // milliseconds
  affectedComponents: string[];
  recommendedActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface HealthScore {
  deviceId: string;
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'degrading';
  factors: Record<string, number>;
  timestamp: Date;
}

export class MaintenancePredictor extends EventEmitter {
  private healthScores = new Map<string, HealthScore>();
  private predictions: MaintenancePrediction[] = [];
  private deviceHistory = new Map<string, SensorReading[]>();

  /**
   * Analyze device health
   */
  async analyzeHealth(deviceId: string, readings: SensorReading[]): Promise<HealthScore> {
    const factors: Record<string, number> = {};

    // Analyze various health factors
    factors.vibration = this.analyzeVibration(readings);
    factors.temperature = this.analyzeTemperature(readings);
    factors.performance = this.analyzePerformance(readings);
    factors.errorRate = this.analyzeErrorRate(readings);

    // Calculate overall health score (0-100)
    const score = Object.values(factors).reduce((sum, f) => sum + f, 0) / Object.keys(factors).length;

    // Determine trend
    const previousScore = this.healthScores.get(deviceId);
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (previousScore) {
      const diff = score - previousScore.score;
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'degrading';
    }

    const healthScore: HealthScore = {
      deviceId,
      score,
      trend,
      factors,
      timestamp: new Date(),
    };

    this.healthScores.set(deviceId, healthScore);

    logger.info({ deviceId, score, trend }, 'Health score calculated');

    return healthScore;
  }

  /**
   * Predict maintenance needs
   */
  async predict(deviceId: string, readings: SensorReading[]): Promise<MaintenancePrediction | null> {
    const health = await this.analyzeHealth(deviceId, readings);

    // Predict based on health score degradation
    if (health.score < 50 && health.trend === 'degrading') {
      const prediction: MaintenancePrediction = {
        deviceId,
        predictionType: health.score < 30 ? 'failure' : 'degradation',
        confidence: (100 - health.score) / 100,
        estimatedTimeToEvent: this.estimateTimeToEvent(health.score),
        affectedComponents: this.identifyAffectedComponents(health.factors),
        recommendedActions: this.generateRecommendations(health),
        severity: this.calculateSeverity(health.score),
        timestamp: new Date(),
      };

      this.predictions.push(prediction);

      logger.warn({ deviceId, prediction }, 'Maintenance prediction generated');

      this.emit('prediction:created', prediction);

      return prediction;
    }

    return null;
  }

  /**
   * Analyze vibration patterns
   */
  private analyzeVibration(readings: SensorReading[]): number {
    const vibrationReadings = readings.filter((r) => r.sensorType === 'vibration');

    if (vibrationReadings.length === 0) {
      return 100; // No data, assume healthy
    }

    // Calculate average vibration
    const avgVibration = vibrationReadings.reduce(
      (sum, r) => sum + (typeof r.value === 'number' ? r.value : 0),
      0
    ) / vibrationReadings.length;

    // Score inversely proportional to vibration (higher vibration = lower score)
    // Assuming normal vibration is < 10, critical is > 50
    if (avgVibration < 10) return 100;
    if (avgVibration > 50) return 0;
    return 100 - ((avgVibration - 10) / 40) * 100;
  }

  /**
   * Analyze temperature patterns
   */
  private analyzeTemperature(readings: SensorReading[]): number {
    const tempReadings = readings.filter((r) => r.sensorType === 'temperature');

    if (tempReadings.length === 0) {
      return 100;
    }

    const avgTemp = tempReadings.reduce(
      (sum, r) => sum + (typeof r.value === 'number' ? r.value : 0),
      0
    ) / tempReadings.length;

    // Assuming normal operating temp is 20-60°C
    if (avgTemp >= 20 && avgTemp <= 60) return 100;
    if (avgTemp < 0 || avgTemp > 100) return 0;
    if (avgTemp < 20) return 50 + (avgTemp / 20) * 50;
    return 100 - ((avgTemp - 60) / 40) * 100;
  }

  /**
   * Analyze performance metrics
   */
  private analyzePerformance(readings: SensorReading[]): number {
    // Analyze reading quality
    const qualityReadings = readings.filter((r) => r.quality !== undefined);

    if (qualityReadings.length === 0) {
      return 100;
    }

    const avgQuality = qualityReadings.reduce((sum, r) => sum + (r.quality ?? 1), 0) / qualityReadings.length;
    return avgQuality * 100;
  }

  /**
   * Analyze error rate
   */
  private analyzeErrorRate(readings: SensorReading[]): number {
    const errorCount = readings.filter((r) => r.quality !== undefined && r.quality < 0.5).length;
    const errorRate = errorCount / readings.length;

    return Math.max(0, 100 - errorRate * 100);
  }

  /**
   * Estimate time to failure/maintenance event
   */
  private estimateTimeToEvent(healthScore: number): number {
    // Simple linear estimation: lower score = less time
    // 100 score = 365 days, 0 score = 0 days
    const days = (healthScore / 100) * 365;
    return days * 24 * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Identify affected components
   */
  private identifyAffectedComponents(factors: Record<string, number>): string[] {
    const affected: string[] = [];

    for (const [component, score] of Object.entries(factors)) {
      if (score < 70) {
        affected.push(component);
      }
    }

    return affected;
  }

  /**
   * Generate maintenance recommendations
   */
  private generateRecommendations(health: HealthScore): string[] {
    const recommendations: string[] = [];

    if (health.factors.vibration < 60) {
      recommendations.push('Inspect and balance rotating components');
      recommendations.push('Check bearing wear');
    }

    if (health.factors.temperature < 60) {
      recommendations.push('Check cooling system');
      recommendations.push('Verify thermal management');
    }

    if (health.factors.performance < 60) {
      recommendations.push('Calibrate sensors');
      recommendations.push('Verify operational parameters');
    }

    if (recommendations.length === 0) {
      recommendations.push('Schedule routine maintenance check');
    }

    return recommendations;
  }

  /**
   * Calculate severity
   */
  private calculateSeverity(healthScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (healthScore < 20) return 'critical';
    if (healthScore < 40) return 'high';
    if (healthScore < 60) return 'medium';
    return 'low';
  }

  /**
   * Get predictions for device
   */
  getDevicePredictions(deviceId: string): MaintenancePrediction[] {
    return this.predictions.filter((p) => p.deviceId === deviceId);
  }

  /**
   * Get device health score
   */
  getHealthScore(deviceId: string): HealthScore | undefined {
    return this.healthScores.get(deviceId);
  }
}
