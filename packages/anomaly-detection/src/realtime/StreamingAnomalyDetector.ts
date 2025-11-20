/**
 * IntelGraph Streaming Anomaly Detector
 * Real-time anomaly detection for streaming time series data
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Anomaly, AnomalyAlert } from '../models/AnomalyModels.js';

export interface StreamingBuffer {
  values: number[];
  timestamps: Date[];
  maxSize: number;
}

export interface AnomalyCallback {
  (anomaly: Anomaly): void | Promise<void>;
}

export class StreamingAnomalyDetector {
  private buffer: StreamingBuffer;
  private mean: number = 0;
  private m2: number = 0; // For Welford's online variance
  private count: number = 0;
  private threshold: number;
  private callbacks: AnomalyCallback[] = [];
  private alertThrottle: Map<string, number> = new Map();

  constructor(bufferSize: number = 100, threshold: number = 3.0) {
    this.buffer = {
      values: [],
      timestamps: [],
      maxSize: bufferSize
    };
    this.threshold = threshold;
  }

  /**
   * Register callback for anomaly notifications
   */
  onAnomaly(callback: AnomalyCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Process incoming data point
   */
  async processPoint(value: number, timestamp: Date): Promise<Anomaly | null> {
    // Add to buffer
    this.buffer.values.push(value);
    this.buffer.timestamps.push(timestamp);

    if (this.buffer.values.length > this.buffer.maxSize) {
      this.buffer.values.shift();
      this.buffer.timestamps.shift();
    }

    // Update statistics using Welford's online algorithm
    this.count++;
    const delta = value - this.mean;
    this.mean += delta / this.count;
    const delta2 = value - this.mean;
    this.m2 += delta * delta2;

    // Need minimum samples before detecting
    if (this.count < 30) return null;

    const variance = this.m2 / (this.count - 1);
    const std = Math.sqrt(variance);

    // Calculate Z-score
    const zScore = Math.abs((value - this.mean) / std);

    if (zScore > this.threshold) {
      const anomaly: Anomaly = {
        timestamp,
        value,
        expected_value: this.mean,
        anomaly_score: zScore / this.threshold,
        severity: this.calculateSeverity(zScore / this.threshold),
        type: 'point',
        detector: 'streaming_zscore',
        explanation: `Streaming anomaly: ${zScore.toFixed(2)} std deviations from mean`,
        metadata: {
          mean: this.mean,
          std,
          count: this.count
        }
      };

      // Notify callbacks
      await this.notifyCallbacks(anomaly);

      return anomaly;
    }

    return null;
  }

  /**
   * Process batch of points
   */
  async processBatch(values: number[], timestamps: Date[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    for (let i = 0; i < values.length; i++) {
      const anomaly = await this.processPoint(values[i], timestamps[i]);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  /**
   * Detect contextual anomalies using rolling window
   */
  async detectContextual(
    value: number,
    timestamp: Date,
    windowSize: number = 20
  ): Promise<Anomaly | null> {
    if (this.buffer.values.length < windowSize) return null;

    const window = this.buffer.values.slice(-windowSize);
    const windowMean = window.reduce((a, b) => a + b, 0) / window.length;

    let windowVariance = 0;
    for (const v of window) {
      windowVariance += Math.pow(v - windowMean, 2);
    }
    const windowStd = Math.sqrt(windowVariance / (window.length - 1));

    if (windowStd === 0) return null;

    const zScore = Math.abs((value - windowMean) / windowStd);

    if (zScore > this.threshold) {
      const anomaly: Anomaly = {
        timestamp,
        value,
        expected_value: windowMean,
        anomaly_score: zScore / this.threshold,
        severity: this.calculateSeverity(zScore / this.threshold),
        type: 'contextual',
        detector: 'streaming_contextual',
        explanation: `Contextual anomaly in rolling window: ${zScore.toFixed(2)} std deviations`,
        metadata: {
          window_mean: windowMean,
          window_std: windowStd,
          window_size: windowSize
        }
      };

      await this.notifyCallbacks(anomaly);
      return anomaly;
    }

    return null;
  }

  /**
   * Detect rate of change anomalies
   */
  async detectRateChange(value: number, timestamp: Date): Promise<Anomaly | null> {
    if (this.buffer.values.length < 2) return null;

    const previousValue = this.buffer.values[this.buffer.values.length - 1];
    const previousTimestamp = this.buffer.timestamps[this.buffer.timestamps.length - 1];

    const timeDiff = (timestamp.getTime() - previousTimestamp.getTime()) / 1000; // seconds
    if (timeDiff === 0) return null;

    const rateOfChange = (value - previousValue) / timeDiff;

    // Calculate historical rate statistics
    const rates: number[] = [];
    for (let i = 1; i < this.buffer.values.length; i++) {
      const dt = (this.buffer.timestamps[i].getTime() - this.buffer.timestamps[i - 1].getTime()) / 1000;
      if (dt > 0) {
        rates.push((this.buffer.values[i] - this.buffer.values[i - 1]) / dt);
      }
    }

    if (rates.length < 10) return null;

    const meanRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    let varianceRate = 0;
    for (const r of rates) {
      varianceRate += Math.pow(r - meanRate, 2);
    }
    const stdRate = Math.sqrt(varianceRate / (rates.length - 1));

    if (stdRate === 0) return null;

    const zScore = Math.abs((rateOfChange - meanRate) / stdRate);

    if (zScore > this.threshold) {
      const anomaly: Anomaly = {
        timestamp,
        value,
        expected_value: previousValue + meanRate * timeDiff,
        anomaly_score: zScore / this.threshold,
        severity: this.calculateSeverity(zScore / this.threshold),
        type: 'point',
        detector: 'streaming_rate_change',
        explanation: `Abnormal rate of change: ${rateOfChange.toFixed(2)} vs expected ${meanRate.toFixed(2)}`,
        metadata: {
          rate_of_change: rateOfChange,
          mean_rate: meanRate,
          std_rate: stdRate
        }
      };

      await this.notifyCallbacks(anomaly);
      return anomaly;
    }

    return null;
  }

  /**
   * Notify all registered callbacks
   */
  private async notifyCallbacks(anomaly: Anomaly): Promise<void> {
    // Throttle alerts (max 1 per minute for same metric)
    const key = `${anomaly.detector}_${anomaly.timestamp.getTime()}`;
    const now = Date.now();
    const lastAlert = this.alertThrottle.get(key);

    if (lastAlert && now - lastAlert < 60000) {
      return; // Throttled
    }

    this.alertThrottle.set(key, now);

    // Clean old throttle entries
    if (this.alertThrottle.size > 1000) {
      const entries = Array.from(this.alertThrottle.entries());
      entries.sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < 500; i++) {
        this.alertThrottle.delete(entries[i][0]);
      }
    }

    // Notify callbacks
    for (const callback of this.callbacks) {
      try {
        await callback(anomaly);
      } catch (error) {
        console.error('Error in anomaly callback:', error);
      }
    }
  }

  /**
   * Calculate severity based on score
   */
  private calculateSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 3.0) return 'critical';
    if (score >= 2.0) return 'high';
    if (score >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.buffer.values = [];
    this.buffer.timestamps = [];
    this.mean = 0;
    this.m2 = 0;
    this.count = 0;
    this.alertThrottle.clear();
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    mean: number;
    std: number;
    count: number;
    bufferSize: number;
  } {
    const variance = this.count > 1 ? this.m2 / (this.count - 1) : 0;
    return {
      mean: this.mean,
      std: Math.sqrt(variance),
      count: this.count,
      bufferSize: this.buffer.values.length
    };
  }
}
