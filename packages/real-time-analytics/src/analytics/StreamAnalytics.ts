/**
 * Stream Analytics Engine
 * Real-time statistical calculations and analytics
 */

import { EventEmitter } from 'events';
import type { Event } from '@intelgraph/event-processing';
import type {
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsGroup,
  Metric,
  TimeSeriesPoint,
  Anomaly,
  AnomalyDetectionConfig,
} from '../types.js';

export class StreamAnalytics extends EventEmitter {
  private queries: Map<string, AnalyticsQuery> = new Map();
  private windowData: Map<string, Map<string, Event[]>> = new Map();
  private statistics: Map<string, Map<string, any>> = new Map();

  constructor() {
    super();
  }

  /**
   * Register analytics query
   */
  registerQuery(query: AnalyticsQuery): void {
    this.queries.set(query.id, query);
    this.windowData.set(query.id, new Map());
    this.statistics.set(query.id, new Map());
    console.log(`Registered analytics query: ${query.name}`);
  }

  /**
   * Remove query
   */
  removeQuery(queryId: string): void {
    this.queries.delete(queryId);
    this.windowData.delete(queryId);
    this.statistics.delete(queryId);
  }

  /**
   * Process event through analytics queries
   */
  async processEvent(event: Event): Promise<void> {
    for (const query of this.queries.values()) {
      if (this.matchesQuery(event, query)) {
        await this.addToWindow(event, query);
        await this.computeMetrics(query);
      }
    }
  }

  /**
   * Check if event matches query
   */
  private matchesQuery(event: Event, query: AnalyticsQuery): boolean {
    // Check event type
    if (!query.eventTypes.includes(event.eventType) && !query.eventTypes.includes('*')) {
      return false;
    }

    // Check filters
    if (query.filters) {
      for (const filter of query.filters) {
        const value = this.getFieldValue(event, filter.field);
        if (!this.evaluateFilter(value, filter)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate filter
   */
  private evaluateFilter(value: any, filter: any): boolean {
    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'gt':
        return value > filter.value;
      case 'gte':
        return value >= filter.value;
      case 'lt':
        return value < filter.value;
      case 'lte':
        return value <= filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      default:
        return false;
    }
  }

  /**
   * Add event to window
   */
  private async addToWindow(event: Event, query: AnalyticsQuery): Promise<void> {
    const groupKey = this.getGroupKey(event, query);
    const queryData = this.windowData.get(query.id)!;
    const events = queryData.get(groupKey) || [];
    events.push(event);

    // Apply windowing
    if (query.window) {
      const filtered = this.applyWindow(events, query.window);
      queryData.set(groupKey, filtered);
    } else {
      queryData.set(groupKey, events);
    }
  }

  /**
   * Get group key for event
   */
  private getGroupKey(event: Event, query: AnalyticsQuery): string {
    if (!query.groupBy || query.groupBy.length === 0) {
      return 'default';
    }

    const keyParts = query.groupBy.map(field => {
      const value = this.getFieldValue(event, field);
      return `${field}=${value}`;
    });

    return keyParts.join('|');
  }

  /**
   * Apply windowing to events
   */
  private applyWindow(events: Event[], window: NonNullable<AnalyticsQuery['window']>): Event[] {
    const now = Date.now();

    switch (window.type) {
      case 'tumbling':
      case 'sliding':
        return events.filter(e => now - e.timestamp <= window.size);
      case 'session':
        // Keep events within session gap
        const sorted = events.sort((a, b) => a.timestamp - b.timestamp);
        const result: Event[] = [];
        let lastTimestamp = 0;

        for (const event of sorted) {
          if (lastTimestamp === 0 || event.timestamp - lastTimestamp <= (window.gap || 5000)) {
            result.push(event);
            lastTimestamp = event.timestamp;
          }
        }
        return result;
      default:
        return events;
    }
  }

  /**
   * Compute metrics for query
   */
  private async computeMetrics(query: AnalyticsQuery): Promise<void> {
    const queryData = this.windowData.get(query.id)!;
    const groups: AnalyticsGroup[] = [];

    for (const [groupKey, events] of queryData) {
      if (events.length === 0) continue;

      const metrics: Record<string, number> = {};

      for (const metric of query.metrics) {
        metrics[metric.name] = this.calculateMetric(events, metric);
      }

      const keys = this.parseGroupKey(groupKey, query.groupBy || []);

      groups.push({
        keys,
        metrics,
        count: events.length,
      });
    }

    const result: AnalyticsResult = {
      queryId: query.id,
      timestamp: Date.now(),
      groups,
    };

    if (query.window) {
      result.window = {
        start: Date.now() - query.window.size,
        end: Date.now(),
      };
    }

    this.emit('analytics:result', result);
  }

  /**
   * Calculate metric value
   */
  private calculateMetric(events: Event[], metric: Metric): number {
    const values = events
      .map(e => this.getFieldValue(e, metric.field))
      .filter(v => typeof v === 'number');

    switch (metric.function) {
      case 'count':
        return events.length;
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      case 'min':
        return values.length > 0 ? Math.min(...values) : 0;
      case 'max':
        return values.length > 0 ? Math.max(...values) : 0;
      case 'stddev':
        return this.calculateStdDev(values);
      case 'variance':
        return this.calculateVariance(values);
      case 'percentile':
        return this.calculatePercentile(values, metric.percentile || 50);
      case 'rate':
        // Events per second
        const timeSpan = events.length > 1 ?
          (events[events.length - 1].timestamp - events[0].timestamp) / 1000 : 1;
        return events.length / timeSpan;
      default:
        return 0;
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Detect anomalies in time series
   */
  async detectAnomalies(
    timeSeries: TimeSeriesPoint[],
    config: AnomalyDetectionConfig
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    switch (config.method) {
      case 'zscore':
        return this.detectZScoreAnomalies(timeSeries, config);
      case 'iqr':
        return this.detectIQRAnomalies(timeSeries, config);
      case 'moving-average':
        return this.detectMovingAverageAnomalies(timeSeries, config);
      default:
        return anomalies;
    }
  }

  /**
   * Z-score based anomaly detection
   */
  private detectZScoreAnomalies(
    timeSeries: TimeSeriesPoint[],
    config: AnomalyDetectionConfig
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const values = timeSeries.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = this.calculateStdDev(values);

    const threshold = config.threshold || 3;

    for (const point of timeSeries) {
      const zScore = Math.abs((point.value - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          expected: mean,
          deviation: zScore,
          severity: this.calculateAnomalySeverity(zScore, threshold),
        });
      }
    }

    return anomalies;
  }

  /**
   * IQR-based anomaly detection
   */
  private detectIQRAnomalies(
    timeSeries: TimeSeriesPoint[],
    config: AnomalyDetectionConfig
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const values = timeSeries.map(p => p.value).sort((a, b) => a - b);

    const q1 = this.calculatePercentile(values, 25);
    const q3 = this.calculatePercentile(values, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - config.sensitivity * iqr;
    const upperBound = q3 + config.sensitivity * iqr;

    for (const point of timeSeries) {
      if (point.value < lowerBound || point.value > upperBound) {
        const expected = (q1 + q3) / 2;
        const deviation = Math.abs(point.value - expected);
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          expected,
          deviation,
          severity: this.calculateAnomalySeverity(deviation / iqr, config.sensitivity),
        });
      }
    }

    return anomalies;
  }

  /**
   * Moving average based anomaly detection
   */
  private detectMovingAverageAnomalies(
    timeSeries: TimeSeriesPoint[],
    config: AnomalyDetectionConfig
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const windowSize = config.windowSize || 10;

    for (let i = windowSize; i < timeSeries.length; i++) {
      const window = timeSeries.slice(i - windowSize, i);
      const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
      const stdDev = this.calculateStdDev(window.map(p => p.value));

      const point = timeSeries[i];
      const deviation = Math.abs(point.value - avg);

      if (deviation > config.sensitivity * stdDev) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          expected: avg,
          deviation: deviation / stdDev,
          severity: this.calculateAnomalySeverity(deviation / stdDev, config.sensitivity),
        });
      }
    }

    return anomalies;
  }

  /**
   * Calculate anomaly severity
   */
  private calculateAnomalySeverity(deviation: number, threshold: number): Anomaly['severity'] {
    if (deviation > threshold * 3) return 'critical';
    if (deviation > threshold * 2) return 'high';
    if (deviation > threshold * 1.5) return 'medium';
    return 'low';
  }

  /**
   * Get field value from event
   */
  private getFieldValue(event: Event, field: string): any {
    const parts = field.split('.');
    let value: any = event;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Parse group key
   */
  private parseGroupKey(groupKey: string, groupBy: string[]): Record<string, any> {
    if (groupKey === 'default') {
      return {};
    }

    const keys: Record<string, any> = {};
    const parts = groupKey.split('|');

    for (const part of parts) {
      const [field, value] = part.split('=');
      keys[field] = value;
    }

    return keys;
  }
}
