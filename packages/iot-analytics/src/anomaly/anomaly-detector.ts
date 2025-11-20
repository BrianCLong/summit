/**
 * Anomaly Detection
 * Real-time anomaly detection for sensor data
 */

import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { SensorReading } from '@intelgraph/sensor-data';

const logger = pino({ name: 'anomaly-detector' });

export interface AnomalyAlert {
  id: string;
  deviceId: string;
  sensorId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'threshold' | 'statistical' | 'pattern' | 'drift';
  description: string;
  value: number;
  expectedRange?: { min: number; max: number };
  confidence: number;
}

export interface ThresholdConfig {
  deviceId: string;
  sensorId: string;
  min?: number;
  max?: number;
  enabled: boolean;
}

export class AnomalyDetector extends EventEmitter {
  private thresholds = new Map<string, ThresholdConfig>();
  private baselines = new Map<string, { mean: number; stdDev: number; samples: number[] }>();
  private alerts: AnomalyAlert[] = [];
  private alertHistory = new Map<string, Date>();

  /**
   * Configure threshold for sensor
   */
  setThreshold(config: ThresholdConfig): void {
    const key = `${config.deviceId}:${config.sensorId}`;
    this.thresholds.set(key, config);
    logger.info({ config }, 'Threshold configured');
  }

  /**
   * Analyze sensor reading for anomalies
   */
  async analyze(reading: SensorReading): Promise<AnomalyAlert | null> {
    if (typeof reading.value !== 'number') {
      return null;
    }

    const key = `${reading.deviceId}:${reading.sensorId}`;

    // Check threshold anomaly
    const thresholdAlert = this.checkThreshold(reading);
    if (thresholdAlert) {
      this.recordAlert(thresholdAlert);
      return thresholdAlert;
    }

    // Check statistical anomaly
    const statisticalAlert = this.checkStatistical(reading);
    if (statisticalAlert) {
      this.recordAlert(statisticalAlert);
      return statisticalAlert;
    }

    // Update baseline
    this.updateBaseline(reading);

    return null;
  }

  /**
   * Check threshold-based anomaly
   */
  private checkThreshold(reading: SensorReading): AnomalyAlert | null {
    const key = `${reading.deviceId}:${reading.sensorId}`;
    const config = this.thresholds.get(key);

    if (!config || !config.enabled || typeof reading.value !== 'number') {
      return null;
    }

    const value = reading.value;

    if ((config.min !== undefined && value < config.min) ||
        (config.max !== undefined && value > config.max)) {
      const severity = this.calculateSeverity(value, config.min, config.max);

      return {
        id: `${Date.now()}-${Math.random()}`,
        deviceId: reading.deviceId,
        sensorId: reading.sensorId,
        timestamp: reading.timestamp,
        severity,
        type: 'threshold',
        description: `Value ${value} outside threshold range [${config.min}, ${config.max}]`,
        value,
        expectedRange: { min: config.min ?? -Infinity, max: config.max ?? Infinity },
        confidence: 1.0,
      };
    }

    return null;
  }

  /**
   * Check statistical anomaly (Z-score method)
   */
  private checkStatistical(reading: SensorReading): AnomalyAlert | null {
    if (typeof reading.value !== 'number') {
      return null;
    }

    const key = `${reading.deviceId}:${reading.sensorId}`;
    const baseline = this.baselines.get(key);

    if (!baseline || baseline.samples.length < 30) {
      return null; // Need more samples
    }

    const value = reading.value;
    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);

    // Anomaly if Z-score > 3 (99.7% confidence)
    if (zScore > 3) {
      const severity = zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium';

      return {
        id: `${Date.now()}-${Math.random()}`,
        deviceId: reading.deviceId,
        sensorId: reading.sensorId,
        timestamp: reading.timestamp,
        severity,
        type: 'statistical',
        description: `Statistical anomaly detected (Z-score: ${zScore.toFixed(2)})`,
        value,
        expectedRange: {
          min: baseline.mean - 3 * baseline.stdDev,
          max: baseline.mean + 3 * baseline.stdDev,
        },
        confidence: Math.min(0.99, (zScore - 3) / 3),
      };
    }

    return null;
  }

  /**
   * Update statistical baseline
   */
  private updateBaseline(reading: SensorReading): void {
    if (typeof reading.value !== 'number') {
      return;
    }

    const key = `${reading.deviceId}:${reading.sensorId}`;
    let baseline = this.baselines.get(key);

    if (!baseline) {
      baseline = { mean: reading.value, stdDev: 0, samples: [] };
      this.baselines.set(key, baseline);
    }

    // Keep last 100 samples
    baseline.samples.push(reading.value);
    if (baseline.samples.length > 100) {
      baseline.samples.shift();
    }

    // Recalculate mean and std dev
    const sum = baseline.samples.reduce((a, b) => a + b, 0);
    baseline.mean = sum / baseline.samples.length;

    const squaredDiffs = baseline.samples.map((x) => Math.pow(x - baseline.mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / baseline.samples.length;
    baseline.stdDev = Math.sqrt(avgSquaredDiff);
  }

  /**
   * Record alert
   */
  private recordAlert(alert: AnomalyAlert): void {
    this.alerts.push(alert);
    this.alertHistory.set(`${alert.deviceId}:${alert.sensorId}`, alert.timestamp);

    logger.warn(
      {
        deviceId: alert.deviceId,
        sensorId: alert.sensorId,
        severity: alert.severity,
        type: alert.type,
      },
      'Anomaly detected'
    );

    this.emit('anomaly:detected', alert);
  }

  /**
   * Calculate severity based on threshold breach
   */
  private calculateSeverity(
    value: number,
    min?: number,
    max?: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (min !== undefined && value < min) {
      const breach = ((min - value) / min) * 100;
      if (breach > 50) return 'critical';
      if (breach > 25) return 'high';
      if (breach > 10) return 'medium';
      return 'low';
    }

    if (max !== undefined && value > max) {
      const breach = ((value - max) / max) * 100;
      if (breach > 50) return 'critical';
      if (breach > 25) return 'high';
      if (breach > 10) return 'medium';
      return 'low';
    }

    return 'low';
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 100): AnomalyAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alerts for device
   */
  getDeviceAlerts(deviceId: string, limit = 100): AnomalyAlert[] {
    return this.alerts.filter((a) => a.deviceId === deviceId).slice(-limit);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThan: Date): void {
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter((a) => a.timestamp > olderThan);
    const removedCount = initialCount - this.alerts.length;

    logger.info({ removedCount }, 'Old alerts cleared');
  }
}
