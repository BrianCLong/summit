import { describe, it, expect, beforeEach } from '@jest/globals';
import { PrometheusMetrics } from '../metrics.js';

describe('PrometheusMetrics', () => {
  let metrics: PrometheusMetrics;

  beforeEach(() => {
    metrics = new PrometheusMetrics('test_ns');
  });

  describe('metricKey', () => {
    // Access private method for testing purposes via any cast
    const getMetricKey = (name: string, labels: Record<string, string>) => {
      return (metrics as any).metricKey(name, labels);
    };

    it('should generate key without labels', () => {
      expect(getMetricKey('counter', {})).toBe('test_ns:counter');
    });

    it('should generate key with single label', () => {
      expect(getMetricKey('counter', { region: 'us' })).toBe('test_ns:counter:{region=us}');
    });

    it('should generate key with multiple labels sorted alphabetically', () => {
      expect(getMetricKey('counter', { region: 'us', env: 'prod' })).toBe(
        'test_ns:counter:{env=prod|region=us}'
      );
    });

    it('should handle labels inserted in different order', () => {
      const key1 = getMetricKey('counter', { a: '1', b: '2' });
      const key2 = getMetricKey('counter', { b: '2', a: '1' });
      expect(key1).toBe('test_ns:counter:{a=1|b=2}');
      expect(key1).toBe(key2);
    });
  });

  describe('Counters', () => {
    it('should increment counter', () => {
      metrics.createCounter('requests', 'Total requests');
      metrics.incrementCounter('requests');
      expect((metrics as any).counters.get('test_ns:requests')).toBe(1);

      metrics.incrementCounter('requests', {}, 2);
      expect((metrics as any).counters.get('test_ns:requests')).toBe(3);
    });

    it('should increment counter with labels', () => {
      metrics.createCounter('requests', 'Total requests');
      metrics.incrementCounter('requests', { status: '200' });
      expect((metrics as any).counters.get('test_ns:requests:{status=200}')).toBe(1);
    });
  });

  describe('Gauges', () => {
    it('should set gauge value', () => {
      metrics.createGauge('memory', 'Memory usage');
      metrics.setGauge('memory', 1024);
      expect((metrics as any).gauges.get('test_ns:memory')).toBe(1024);

      metrics.setGauge('memory', 2048);
      expect((metrics as any).gauges.get('test_ns:memory')).toBe(2048);
    });
  });

  describe('Histograms', () => {
    it('should observe histogram values', () => {
      metrics.createHistogram('latency', 'Request latency');
      metrics.observeHistogram('latency', 0.1);
      metrics.observeHistogram('latency', 0.2);

      const values = (metrics as any).histograms.get('test_ns:latency');
      expect(values).toHaveLength(2);
      expect(values).toContain(0.1);
      expect(values).toContain(0.2);
    });
  });
});
