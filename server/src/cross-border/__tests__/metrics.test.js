"use strict";
/**
 * Unit tests for Cross-Border Metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
const metrics_js_1 = require("../metrics.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('CrossBorderMetrics', () => {
    let metrics;
    (0, globals_1.beforeEach)(() => {
        metrics = new metrics_js_1.CrossBorderMetrics();
    });
    (0, globals_1.describe)('counters', () => {
        (0, globals_1.it)('should increment counter', () => {
            metrics.incCounter('cross_border_handovers_total', {
                source_nation: 'US',
                target_nation: 'EE',
                status: 'success',
            });
            const prometheus = metrics.toPrometheus();
            (0, globals_1.expect)(prometheus).toContain('cross_border_handovers_total');
            (0, globals_1.expect)(prometheus).toContain('source_nation="US"');
        });
        (0, globals_1.it)('should accumulate counter values', () => {
            for (let i = 0; i < 5; i++) {
                metrics.incCounter('cross_border_handovers_total', {
                    source_nation: 'US',
                    target_nation: 'EE',
                    status: 'success',
                });
            }
            const json = metrics.toJSON();
            const handovers = json['cross_border_handovers_total'];
            const key = Object.keys(handovers)[0];
            (0, globals_1.expect)(handovers[key]).toBe(5);
        });
    });
    (0, globals_1.describe)('gauges', () => {
        (0, globals_1.it)('should set gauge value', () => {
            metrics.setGauge('cross_border_active_sessions', 10);
            const prometheus = metrics.toPrometheus();
            (0, globals_1.expect)(prometheus).toContain('cross_border_active_sessions 10');
        });
        (0, globals_1.it)('should increment gauge', () => {
            metrics.setGauge('cross_border_active_sessions', 5);
            metrics.incGauge('cross_border_active_sessions', {}, 3);
            const json = metrics.toJSON();
            (0, globals_1.expect)(json['cross_border_active_sessions']).toEqual({ '': 8 });
        });
        (0, globals_1.it)('should decrement gauge', () => {
            metrics.setGauge('cross_border_active_sessions', 10);
            metrics.decGauge('cross_border_active_sessions', {}, 3);
            const json = metrics.toJSON();
            (0, globals_1.expect)(json['cross_border_active_sessions']).toEqual({ '': 7 });
        });
    });
    (0, globals_1.describe)('histograms', () => {
        (0, globals_1.it)('should observe histogram values', () => {
            metrics.observeHistogram('cross_border_handover_duration_seconds', 0.5, {
                source_nation: 'US',
                target_nation: 'EE',
            });
            const prometheus = metrics.toPrometheus();
            (0, globals_1.expect)(prometheus).toContain('cross_border_handover_duration_seconds_bucket');
            (0, globals_1.expect)(prometheus).toContain('cross_border_handover_duration_seconds_sum');
            (0, globals_1.expect)(prometheus).toContain('cross_border_handover_duration_seconds_count');
        });
        (0, globals_1.it)('should track bucket counts correctly', () => {
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
            const histogram = json['cross_border_handover_duration_seconds'];
            const data = Object.values(histogram)[0];
            (0, globals_1.expect)(data.count).toBe(3);
            (0, globals_1.expect)(data.sum).toBeCloseTo(15.85, 1);
        });
    });
    (0, globals_1.describe)('timer', () => {
        (0, globals_1.it)('should measure duration', async () => {
            const done = metrics.startTimer('cross_border_handover_duration_seconds', {
                source_nation: 'US',
                target_nation: 'FI',
            });
            // Simulate some work
            await new Promise((resolve) => setTimeout(resolve, 50));
            done();
            const json = metrics.toJSON();
            const histogram = json['cross_border_handover_duration_seconds'];
            const data = Object.values(histogram)[0];
            (0, globals_1.expect)(data.count).toBe(1);
            (0, globals_1.expect)(data.sum).toBeGreaterThan(0.04);
            (0, globals_1.expect)(data.sum).toBeLessThan(0.2);
        });
    });
    (0, globals_1.describe)('prometheus export', () => {
        (0, globals_1.it)('should include HELP and TYPE comments', () => {
            metrics.incCounter('cross_border_handovers_total', {
                source_nation: 'US',
                target_nation: 'EE',
                status: 'success',
            });
            const prometheus = metrics.toPrometheus();
            (0, globals_1.expect)(prometheus).toContain('# HELP cross_border_handovers_total');
            (0, globals_1.expect)(prometheus).toContain('# TYPE cross_border_handovers_total counter');
        });
        (0, globals_1.it)('should format labels correctly', () => {
            metrics.incCounter('cross_border_handovers_total', {
                source_nation: 'US',
                target_nation: 'EE',
                status: 'success',
            });
            const prometheus = metrics.toPrometheus();
            // Labels should be sorted alphabetically
            (0, globals_1.expect)(prometheus).toMatch(/cross_border_handovers_total\{source_nation="US",status="success",target_nation="EE"\}/);
        });
    });
    (0, globals_1.describe)('JSON export', () => {
        (0, globals_1.it)('should export as JSON', () => {
            metrics.incCounter('cross_border_handovers_total', {
                source_nation: 'US',
                target_nation: 'EE',
                status: 'success',
            });
            metrics.setGauge('cross_border_active_sessions', 5);
            const json = metrics.toJSON();
            (0, globals_1.expect)(json).toHaveProperty('cross_border_handovers_total');
            (0, globals_1.expect)(json).toHaveProperty('cross_border_active_sessions');
        });
    });
    (0, globals_1.describe)('reset', () => {
        (0, globals_1.it)('should reset all metrics', () => {
            metrics.incCounter('cross_border_handovers_total', {
                source_nation: 'US',
                target_nation: 'EE',
                status: 'success',
            });
            metrics.setGauge('cross_border_active_sessions', 10);
            metrics.reset();
            const json = metrics.toJSON();
            (0, globals_1.expect)(json['cross_border_handovers_total']).toEqual({});
            (0, globals_1.expect)(json['cross_border_active_sessions']).toEqual({});
        });
    });
});
(0, globals_1.describe)('convenience functions', () => {
    (0, globals_1.describe)('recordHandover', () => {
        (0, globals_1.it)('should record handover metrics', () => {
            (0, metrics_js_1.recordHandover)('US', 'EE', 'success', 1.5);
            // Should not throw - metrics recorded internally
        });
    });
    (0, globals_1.describe)('recordTranslation', () => {
        (0, globals_1.it)('should record translation metrics', () => {
            (0, metrics_js_1.recordTranslation)('en', 'et', 'success', 0.2);
            // Should not throw - metrics recorded internally
        });
    });
});
