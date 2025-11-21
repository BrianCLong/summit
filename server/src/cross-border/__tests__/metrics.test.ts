/**
 * Unit tests for Cross-Border Metrics
 */

import { CrossBorderMetrics, recordHandover, recordTranslation } from '../metrics.js';

describe('CrossBorderMetrics', () => {
  let metrics: CrossBorderMetrics;

  beforeEach(() => {
    metrics = new CrossBorderMetrics();
  });

  describe('counters', () => {
    it('should increment counter', () => {
      metrics.incCounter('cross_border_handovers_total', {
        source_nation: 'US',
        target_nation: 'EE',
        status: 'success',
      });

      const prometheus = metrics.toPrometheus();
      expect(prometheus).toContain('cross_border_handovers_total');
      expect(prometheus).toContain('source_nation="US"');
    });

    it('should accumulate counter values', () => {
      for (let i = 0; i < 5; i++) {
        metrics.incCounter('cross_border_handovers_total', {
          source_nation: 'US',
          target_nation: 'EE',
          status: 'success',
        });
      }

      const json = metrics.toJSON();
      const handovers = json['cross_border_handovers_total'] as Record<string, number>;
      const key = Object.keys(handovers)[0];
      expect(handovers[key]).toBe(5);
    });
  });

  describe('gauges', () => {
    it('should set gauge value', () => {
      metrics.setGauge('cross_border_active_sessions', 10);

      const prometheus = metrics.toPrometheus();
      expect(prometheus).toContain('cross_border_active_sessions 10');
    });

    it('should increment gauge', () => {
      metrics.setGauge('cross_border_active_sessions', 5);
      metrics.incGauge('cross_border_active_sessions', {}, 3);

      const json = metrics.toJSON();
      expect(json['cross_border_active_sessions']).toEqual({ '': 8 });
    });

    it('should decrement gauge', () => {
      metrics.setGauge('cross_border_active_sessions', 10);
      metrics.decGauge('cross_border_active_sessions', {}, 3);

      const json = metrics.toJSON();
      expect(json['cross_border_active_sessions']).toEqual({ '': 7 });
    });
  });

  describe('histograms', () => {
    it('should observe histogram values', () => {
      metrics.observeHistogram('cross_border_handover_duration_seconds', 0.5, {
        source_nation: 'US',
        target_nation: 'EE',
      });

      const prometheus = metrics.toPrometheus();
      expect(prometheus).toContain('cross_border_handover_duration_seconds_bucket');
      expect(prometheus).toContain('cross_border_handover_duration_seconds_sum');
      expect(prometheus).toContain('cross_border_handover_duration_seconds_count');
    });

    it('should track bucket counts correctly', () => {
      // Observe values in different buckets
      metrics.observeHistogram('cross_border_handover_duration_seconds', 0.05, {
        source_nation: 'US',
        target_nation: 'EE',
      }); // <= 0.1

      metrics.observeHistogram('cross_border_handover_duration_seconds', 0.8, {
        source_nation: 'US',
        target_nation: 'EE',
      }); // <= 1

      metrics.observeHistogram('cross_border_handover_duration_seconds', 15, {
        source_nation: 'US',
        target_nation: 'EE',
      }); // > 10 (only in +Inf)

      const json = metrics.toJSON();
      const histogram = json['cross_border_handover_duration_seconds'] as Record<
        string,
        { count: number; sum: number }
      >;
      const data = Object.values(histogram)[0];

      expect(data.count).toBe(3);
      expect(data.sum).toBeCloseTo(15.85, 1);
    });
  });

  describe('timer', () => {
    it('should measure duration', async () => {
      const done = metrics.startTimer('cross_border_handover_duration_seconds', {
        source_nation: 'US',
        target_nation: 'FI',
      });

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 50));

      done();

      const json = metrics.toJSON();
      const histogram = json['cross_border_handover_duration_seconds'] as Record<
        string,
        { count: number; sum: number }
      >;
      const data = Object.values(histogram)[0];

      expect(data.count).toBe(1);
      expect(data.sum).toBeGreaterThan(0.04);
      expect(data.sum).toBeLessThan(0.2);
    });
  });

  describe('prometheus export', () => {
    it('should include HELP and TYPE comments', () => {
      metrics.incCounter('cross_border_handovers_total', {
        source_nation: 'US',
        target_nation: 'EE',
        status: 'success',
      });

      const prometheus = metrics.toPrometheus();

      expect(prometheus).toContain('# HELP cross_border_handovers_total');
      expect(prometheus).toContain('# TYPE cross_border_handovers_total counter');
    });

    it('should format labels correctly', () => {
      metrics.incCounter('cross_border_handovers_total', {
        source_nation: 'US',
        target_nation: 'EE',
        status: 'success',
      });

      const prometheus = metrics.toPrometheus();

      // Labels should be sorted alphabetically
      expect(prometheus).toMatch(
        /cross_border_handovers_total\{source_nation="US",status="success",target_nation="EE"\}/
      );
    });
  });

  describe('JSON export', () => {
    it('should export as JSON', () => {
      metrics.incCounter('cross_border_handovers_total', {
        source_nation: 'US',
        target_nation: 'EE',
        status: 'success',
      });
      metrics.setGauge('cross_border_active_sessions', 5);

      const json = metrics.toJSON();

      expect(json).toHaveProperty('cross_border_handovers_total');
      expect(json).toHaveProperty('cross_border_active_sessions');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      metrics.incCounter('cross_border_handovers_total', {
        source_nation: 'US',
        target_nation: 'EE',
        status: 'success',
      });
      metrics.setGauge('cross_border_active_sessions', 10);

      metrics.reset();

      const json = metrics.toJSON();
      expect(json['cross_border_handovers_total']).toEqual({});
      expect(json['cross_border_active_sessions']).toEqual({});
    });
  });
});

describe('convenience functions', () => {
  describe('recordHandover', () => {
    it('should record handover metrics', () => {
      recordHandover('US', 'EE', 'success', 1.5);
      // Should not throw - metrics recorded internally
    });
  });

  describe('recordTranslation', () => {
    it('should record translation metrics', () => {
      recordTranslation('en', 'et', 'success', 0.2);
      // Should not throw - metrics recorded internally
    });
  });
});
