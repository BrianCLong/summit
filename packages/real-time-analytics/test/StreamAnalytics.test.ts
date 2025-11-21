/**
 * StreamAnalytics Tests
 */

import { StreamAnalytics, type AnalyticsQuery, type AnomalyDetectionConfig, type TimeSeriesPoint } from '../src/index.js';
import type { Event } from '@intelgraph/event-processing';

describe('StreamAnalytics', () => {
  let analytics: StreamAnalytics;

  beforeEach(() => {
    analytics = new StreamAnalytics();
  });

  const createEvent = (eventType: string, data: Record<string, any> = {}): Event => ({
    eventId: `evt-${Date.now()}-${Math.random()}`,
    eventType,
    eventSource: 'test',
    timestamp: Date.now(),
    key: null,
    value: JSON.stringify(data),
    offset: 0,
    partition: 0,
    topic: 'test-events',
    metadata: data,
    ...data,
  });

  describe('query registration', () => {
    it('should register an analytics query', () => {
      const query: AnalyticsQuery = {
        id: 'test-query',
        name: 'Test Query',
        eventTypes: ['test.event'],
        metrics: [
          { name: 'count', field: 'eventId', function: 'count' },
        ],
      };

      analytics.registerQuery(query);
      // Should register without error
    });

    it('should remove a query', () => {
      const query: AnalyticsQuery = {
        id: 'remove-query',
        name: 'Remove Query',
        eventTypes: ['test.event'],
        metrics: [
          { name: 'count', field: 'eventId', function: 'count' },
        ],
      };

      analytics.registerQuery(query);
      analytics.removeQuery('remove-query');
      // Should remove without error
    });
  });

  describe('metrics computation', () => {
    it('should compute count metric', async () => {
      const results: any[] = [];

      const query: AnalyticsQuery = {
        id: 'count-query',
        name: 'Count Query',
        eventTypes: ['api.request'],
        metrics: [
          { name: 'request_count', field: 'eventId', function: 'count' },
        ],
      };

      analytics.registerQuery(query);
      analytics.on('analytics:result', (result) => results.push(result));

      for (let i = 0; i < 5; i++) {
        await analytics.processEvent(createEvent('api.request', { duration: 100 + i * 10 }));
      }

      expect(results.length).toBeGreaterThan(0);
    });

    it('should compute sum metric', async () => {
      const results: any[] = [];

      const query: AnalyticsQuery = {
        id: 'sum-query',
        name: 'Sum Query',
        eventTypes: ['order.placed'],
        metrics: [
          { name: 'total_amount', field: 'amount', function: 'sum' },
        ],
      };

      analytics.registerQuery(query);
      analytics.on('analytics:result', (result) => results.push(result));

      await analytics.processEvent(createEvent('order.placed', { amount: 100 }));
      await analytics.processEvent(createEvent('order.placed', { amount: 200 }));
      await analytics.processEvent(createEvent('order.placed', { amount: 300 }));
    });

    it('should compute avg metric', async () => {
      const results: any[] = [];

      const query: AnalyticsQuery = {
        id: 'avg-query',
        name: 'Average Query',
        eventTypes: ['response.time'],
        metrics: [
          { name: 'avg_response_time', field: 'duration', function: 'avg' },
        ],
      };

      analytics.registerQuery(query);
      analytics.on('analytics:result', (result) => results.push(result));

      await analytics.processEvent(createEvent('response.time', { duration: 100 }));
      await analytics.processEvent(createEvent('response.time', { duration: 200 }));
      await analytics.processEvent(createEvent('response.time', { duration: 300 }));
    });

    it('should compute percentile metric', async () => {
      const results: any[] = [];

      const query: AnalyticsQuery = {
        id: 'percentile-query',
        name: 'Percentile Query',
        eventTypes: ['latency.reported'],
        metrics: [
          { name: 'p95_latency', field: 'latency', function: 'percentile', percentile: 95 },
        ],
      };

      analytics.registerQuery(query);
      analytics.on('analytics:result', (result) => results.push(result));

      for (let i = 0; i < 100; i++) {
        await analytics.processEvent(createEvent('latency.reported', { latency: i }));
      }
    });
  });

  describe('groupBy', () => {
    it('should group metrics by field', async () => {
      const results: any[] = [];

      const query: AnalyticsQuery = {
        id: 'group-query',
        name: 'Group Query',
        eventTypes: ['user.action'],
        metrics: [
          { name: 'action_count', field: 'eventId', function: 'count' },
        ],
        groupBy: ['region'],
      };

      analytics.registerQuery(query);
      analytics.on('analytics:result', (result) => results.push(result));

      await analytics.processEvent(createEvent('user.action', { region: 'us-east', action: 'click' }));
      await analytics.processEvent(createEvent('user.action', { region: 'us-west', action: 'click' }));
      await analytics.processEvent(createEvent('user.action', { region: 'us-east', action: 'view' }));
    });
  });

  describe('windowing', () => {
    it('should apply tumbling window', async () => {
      const results: any[] = [];

      const query: AnalyticsQuery = {
        id: 'tumbling-query',
        name: 'Tumbling Window Query',
        eventTypes: ['metric.reported'],
        window: {
          type: 'tumbling',
          size: 5000,
        },
        metrics: [
          { name: 'value_sum', field: 'value', function: 'sum' },
        ],
      };

      analytics.registerQuery(query);
      analytics.on('analytics:result', (result) => results.push(result));

      await analytics.processEvent(createEvent('metric.reported', { value: 10 }));
      await analytics.processEvent(createEvent('metric.reported', { value: 20 }));
    });
  });

  describe('anomaly detection', () => {
    it('should detect z-score anomalies', async () => {
      const timeSeries: TimeSeriesPoint[] = [];
      const now = Date.now();

      // Normal values
      for (let i = 0; i < 50; i++) {
        timeSeries.push({
          timestamp: now + i * 1000,
          value: 100 + Math.random() * 10 - 5, // 95-105 range
        });
      }

      // Add anomaly
      timeSeries.push({
        timestamp: now + 50 * 1000,
        value: 500, // Anomaly
      });

      const config: AnomalyDetectionConfig = {
        method: 'zscore',
        sensitivity: 3,
        threshold: 3,
      };

      const anomalies = await analytics.detectAnomalies(timeSeries, config);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].value).toBe(500);
    });

    it('should detect IQR anomalies', async () => {
      const timeSeries: TimeSeriesPoint[] = [];
      const now = Date.now();

      for (let i = 0; i < 50; i++) {
        timeSeries.push({
          timestamp: now + i * 1000,
          value: 100 + i % 10,
        });
      }

      // Add outlier
      timeSeries.push({
        timestamp: now + 50 * 1000,
        value: 1000,
      });

      const config: AnomalyDetectionConfig = {
        method: 'iqr',
        sensitivity: 1.5,
      };

      const anomalies = await analytics.detectAnomalies(timeSeries, config);
      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should detect moving average anomalies', async () => {
      const timeSeries: TimeSeriesPoint[] = [];
      const now = Date.now();

      for (let i = 0; i < 20; i++) {
        timeSeries.push({
          timestamp: now + i * 1000,
          value: 100,
        });
      }

      // Add spike
      timeSeries.push({
        timestamp: now + 20 * 1000,
        value: 500,
      });

      const config: AnomalyDetectionConfig = {
        method: 'moving-average',
        sensitivity: 2,
        windowSize: 5,
      };

      const anomalies = await analytics.detectAnomalies(timeSeries, config);
      expect(anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('filtering', () => {
    it('should filter events based on query filters', async () => {
      const results: any[] = [];

      const query: AnalyticsQuery = {
        id: 'filter-query',
        name: 'Filter Query',
        eventTypes: ['transaction'],
        metrics: [
          { name: 'high_value_count', field: 'eventId', function: 'count' },
        ],
        filters: [
          { field: 'amount', operator: 'gt', value: 1000 },
        ],
      };

      analytics.registerQuery(query);
      analytics.on('analytics:result', (result) => results.push(result));

      await analytics.processEvent(createEvent('transaction', { amount: 500 })); // Filtered out
      await analytics.processEvent(createEvent('transaction', { amount: 1500 })); // Included
      await analytics.processEvent(createEvent('transaction', { amount: 2000 })); // Included
    });
  });
});
