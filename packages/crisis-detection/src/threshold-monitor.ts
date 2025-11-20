import { ThresholdMonitor, ThresholdConfig, SeverityLevel } from './types';

export class MetricThresholdMonitor implements ThresholdMonitor {
  private thresholds: Map<string, ThresholdConfig[]> = new Map();
  private metricHistory: Map<string, MetricDataPoint[]> = new Map();
  private violations: ThresholdConfig[] = [];

  addThreshold(config: ThresholdConfig): void {
    const configs = this.thresholds.get(config.metricType) || [];
    configs.push(config);
    this.thresholds.set(config.metricType, configs);
  }

  removeThreshold(thresholdId: string): void {
    for (const [metricType, configs] of this.thresholds.entries()) {
      const filtered = configs.filter((c) => c.id !== thresholdId);
      if (filtered.length > 0) {
        this.thresholds.set(metricType, filtered);
      } else {
        this.thresholds.delete(metricType);
      }
    }
  }

  async checkThreshold(metric: string, value: number): Promise<boolean> {
    const timestamp = Date.now();

    // Store metric data point
    this.addMetricDataPoint(metric, value, timestamp);

    const configs = this.thresholds.get(metric);
    if (!configs) {
      return false;
    }

    let violated = false;

    for (const config of configs) {
      if (!config.enabled) continue;

      const windowStart = timestamp - config.windowMinutes * 60 * 1000;
      const windowData = this.getMetricWindow(metric, windowStart, timestamp);

      if (this.evaluateThreshold(config, windowData)) {
        violated = true;
        if (!this.violations.some((v) => v.id === config.id)) {
          this.violations.push(config);
        }
      }
    }

    return violated;
  }

  getViolations(): ThresholdConfig[] {
    return [...this.violations];
  }

  clearViolation(thresholdId: string): void {
    this.violations = this.violations.filter((v) => v.id !== thresholdId);
  }

  private addMetricDataPoint(metric: string, value: number, timestamp: number): void {
    const history = this.metricHistory.get(metric) || [];
    history.push({ value, timestamp });

    // Keep only last 24 hours of data
    const cutoff = timestamp - 24 * 60 * 60 * 1000;
    const filtered = history.filter((dp) => dp.timestamp > cutoff);

    this.metricHistory.set(metric, filtered);
  }

  private getMetricWindow(
    metric: string,
    startTime: number,
    endTime: number
  ): MetricDataPoint[] {
    const history = this.metricHistory.get(metric) || [];
    return history.filter(
      (dp) => dp.timestamp >= startTime && dp.timestamp <= endTime
    );
  }

  private evaluateThreshold(
    config: ThresholdConfig,
    data: MetricDataPoint[]
  ): boolean {
    if (data.length === 0) return false;

    // Use most recent value in window
    const latestValue = data[data.length - 1].value;

    switch (config.operator) {
      case 'gt':
        return latestValue > config.threshold;
      case 'gte':
        return latestValue >= config.threshold;
      case 'lt':
        return latestValue < config.threshold;
      case 'lte':
        return latestValue <= config.threshold;
      case 'eq':
        return latestValue === config.threshold;
      case 'neq':
        return latestValue !== config.threshold;
      default:
        return false;
    }
  }
}

export class AdaptiveThresholdMonitor {
  private baselineData: Map<string, number[]> = new Map();
  private thresholdMultipliers: Map<SeverityLevel, number> = new Map([
    [SeverityLevel.INFO, 1.0],
    [SeverityLevel.LOW, 1.5],
    [SeverityLevel.MEDIUM, 2.0],
    [SeverityLevel.HIGH, 3.0],
    [SeverityLevel.CRITICAL, 4.0],
    [SeverityLevel.CATASTROPHIC, 5.0],
  ]);

  updateBaseline(metric: string, data: number[]): void {
    this.baselineData.set(metric, data);
  }

  checkAdaptiveThreshold(
    metric: string,
    value: number,
    severity: SeverityLevel
  ): boolean {
    const baseline = this.baselineData.get(metric);
    if (!baseline || baseline.length === 0) {
      return false;
    }

    const stats = this.calculateStatistics(baseline);
    const multiplier = this.thresholdMultipliers.get(severity) || 2.0;

    // Use standard deviation based threshold
    const threshold = stats.mean + multiplier * stats.stdDev;

    return value > threshold;
  }

  private calculateStatistics(data: number[]): { mean: number; stdDev: number } {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;

    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;

    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }
}

export class AnomalyDetectionEngine {
  detectZScore(data: number[], threshold: number = 3.0): number[] {
    if (data.length < 2) return [];

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return [];

    const anomalies: number[] = [];

    data.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push(index);
      }
    });

    return anomalies;
  }

  detectMAD(data: number[], threshold: number = 3.5): number[] {
    // Median Absolute Deviation (MAD) - more robust than Z-score
    if (data.length < 2) return [];

    const median = this.calculateMedian(data);
    const deviations = data.map((val) => Math.abs(val - median));
    const mad = this.calculateMedian(deviations);

    if (mad === 0) return [];

    const anomalies: number[] = [];

    data.forEach((value, index) => {
      const modifiedZScore = (0.6745 * Math.abs(value - median)) / mad;
      if (modifiedZScore > threshold) {
        anomalies.push(index);
      }
    });

    return anomalies;
  }

  detectIQR(data: number[]): number[] {
    // Interquartile Range (IQR) method
    if (data.length < 4) return [];

    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const anomalies: number[] = [];

    data.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        anomalies.push(index);
      }
    });

    return anomalies;
  }

  detectMovingAverage(
    data: number[],
    windowSize: number = 10,
    threshold: number = 2.0
  ): number[] {
    if (data.length < windowSize) return [];

    const anomalies: number[] = [];

    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance =
        window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        window.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        const deviation = Math.abs((data[i] - mean) / stdDev);
        if (deviation > threshold) {
          anomalies.push(i);
        }
      }
    }

    return anomalies;
  }

  private calculateMedian(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }
}

interface MetricDataPoint {
  value: number;
  timestamp: number;
}

export class EarlyWarningSystem {
  private indicators: Map<string, IndicatorConfig> = new Map();
  private thresholdMonitor: MetricThresholdMonitor;
  private anomalyDetector: AnomalyDetectionEngine;

  constructor() {
    this.thresholdMonitor = new MetricThresholdMonitor();
    this.anomalyDetector = new AnomalyDetectionEngine();
  }

  registerIndicator(config: IndicatorConfig): void {
    this.indicators.set(config.name, config);
  }

  async evaluateIndicators(): Promise<EarlyWarning[]> {
    const warnings: EarlyWarning[] = [];

    for (const [name, config] of this.indicators.entries()) {
      try {
        const value = await config.getValue();

        // Check against thresholds
        const thresholdViolated = await this.thresholdMonitor.checkThreshold(
          name,
          value
        );

        if (thresholdViolated) {
          warnings.push({
            indicator: name,
            value,
            severity: config.severity,
            message: `${name} exceeded threshold: ${value}`,
            timestamp: new Date(),
          });
        }

        // Check for anomalies if historical data available
        if (config.historicalData && config.historicalData.length > 10) {
          const anomalies = this.anomalyDetector.detectMAD(
            [...config.historicalData, value],
            config.anomalyThreshold || 3.5
          );

          if (anomalies.includes(config.historicalData.length)) {
            warnings.push({
              indicator: name,
              value,
              severity: config.severity,
              message: `${name} shows anomalous behavior: ${value}`,
              timestamp: new Date(),
            });
          }
        }
      } catch (error) {
        console.error(`Error evaluating indicator ${name}:`, error);
      }
    }

    return warnings;
  }
}

interface IndicatorConfig {
  name: string;
  getValue: () => Promise<number>;
  severity: SeverityLevel;
  historicalData?: number[];
  anomalyThreshold?: number;
}

interface EarlyWarning {
  indicator: string;
  value: number;
  severity: SeverityLevel;
  message: string;
  timestamp: Date;
}
