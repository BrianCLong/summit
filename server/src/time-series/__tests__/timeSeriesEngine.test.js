"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const influx_connector_js_1 = require("../connectors/influx-connector.js");
const engine_js_1 = require("../engine.js");
const forecast_js_1 = require("../analysis/forecast.js");
const downsampling_js_1 = require("../pipelines/downsampling.js");
(0, globals_1.describe)('time-series engine', () => {
    (0, globals_1.it)('formats Influx line protocol with tags and timestamp', () => {
        const point = {
            timestamp: new Date('2024-01-01T00:00:00Z'),
            values: { cpu: 0.5 },
            tags: { host: 'edge-1' },
        };
        const line = influx_connector_js_1.__private__.toLineProtocol({
            measurement: 'metrics',
            fields: point.values,
            tags: point.tags,
            timestamp: point.timestamp,
        });
        (0, globals_1.expect)(line).toContain('metrics,host=edge-1 cpu=0.5');
        (0, globals_1.expect)(line).toContain('000000000');
    });
    (0, globals_1.it)('runs anomaly detection, forecasting, downsampling, and dashboard composition', async () => {
        const now = Date.now();
        const series = Array.from({ length: 60 }, (_, idx) => ({
            timestamp: new Date(now + idx * 60_000),
            values: { cpu: idx === 40 ? 50 : idx + 1 },
        }));
        const connector = new MemoryConnector(series);
        const engine = new engine_js_1.TimeSeriesEngine({ timescale: connector }, 'timescale');
        const result = await engine.analyze({
            query: {
                measurement: 'metrics',
                start: new Date(now),
                end: new Date(now + 60 * 60_000),
            },
            downsample: { strategy: 'lttb', targetPoints: 10 },
            anomaly: { field: 'cpu', strategy: 'zscore', threshold: 3 },
            forecast: { field: 'cpu', model: 'arima', horizon: 3 },
            dashboardName: 'operations',
        });
        (0, globals_1.expect)(result.series.length).toBeLessThan(series.length);
        (0, globals_1.expect)(Array.isArray(result.anomalies)).toBe(true);
        (0, globals_1.expect)(result.forecast).toHaveLength(3);
        (0, globals_1.expect)(result.dashboard?.panels).toHaveLength(2);
    });
    (0, globals_1.it)('supports prophet-style forecasting with seasonal components', () => {
        const now = Date.now();
        const series = Array.from({ length: 24 }, (_, idx) => ({
            timestamp: new Date(now + idx * 3_600_000),
            values: { demand: Math.sin(idx / 3) * 10 + 50 },
        }));
        const forecast = (0, forecast_js_1.prophetForecast)(series, 'demand', 5, { confidence: 0.1 });
        (0, globals_1.expect)(forecast).toHaveLength(5);
        forecast.forEach((point) => {
            (0, globals_1.expect)(point.upper).toBeGreaterThan(point.lower);
        });
    });
    (0, globals_1.it)('applies Largest Triangle Three Buckets downsampling deterministically', () => {
        const now = Date.now();
        const series = Array.from({ length: 100 }, (_, idx) => ({
            timestamp: new Date(now + idx * 1000),
            values: { metric: idx },
        }));
        const sampled = (0, downsampling_js_1.largestTriangleThreeBuckets)(series, 20);
        (0, globals_1.expect)(sampled[0]).toEqual(series[0]);
        (0, globals_1.expect)(sampled[sampled.length - 1]).toEqual(series[series.length - 1]);
        (0, globals_1.expect)(sampled.length).toBe(20);
    });
});
class MemoryConnector {
    series;
    constructor(series) {
        this.series = series;
    }
    async writePoints() {
        return Promise.resolve();
    }
    async queryRange() {
        return this.series;
    }
    async aggregate() {
        return this.series;
    }
}
