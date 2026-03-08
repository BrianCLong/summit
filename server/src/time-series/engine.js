"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private__ = exports.TimeSeriesEngine = void 0;
const anomaly_js_1 = require("./analysis/anomaly.js");
const forecast_js_1 = require("./analysis/forecast.js");
const dashboard_js_1 = require("./dashboard/dashboard.js");
const downsampling_js_1 = require("./pipelines/downsampling.js");
class TimeSeriesEngine {
    connectors;
    defaultConnector;
    constructor(connectors, defaultConnector) {
        this.connectors = connectors;
        this.defaultConnector = defaultConnector;
    }
    async ingest(points, connectorName) {
        const connector = this.requireConnector(connectorName);
        const formatted = points.map((point) => ({
            measurement: 'default',
            fields: point.values,
            tags: point.tags,
            timestamp: point.timestamp,
        }));
        await connector.writePoints(formatted);
    }
    async fetch(params, connectorName, aggregation) {
        const connector = this.requireConnector(connectorName);
        if (aggregation) {
            const aggParams = { ...params, window: aggregation };
            return connector.aggregate(aggParams);
        }
        return connector.queryRange(params);
    }
    async analyze(options) {
        const connector = options.connector ?? this.defaultConnector;
        const raw = await this.fetch(options.query, connector, options.aggregation);
        const series = this.applyDownsampling(raw, options.downsample);
        const anomalies = options.anomaly
            ? this.detectAnomalies(series, options.anomaly)
            : [];
        const forecast = options.forecast
            ? this.runForecast(series, options.forecast)
            : [];
        const dashboard = options.dashboardName
            ? (0, dashboard_js_1.buildDashboard)(options.dashboardName, series, anomalies, forecast, options.dashboardDescription)
            : undefined;
        return { series, anomalies, forecast, dashboard };
    }
    detectAnomalies(series, config) {
        if (!series.length)
            return [];
        const strategy = config.strategy ?? 'zscore';
        if (strategy === 'seasonal') {
            return (0, anomaly_js_1.seasonalEwmaAnomalies)(series, config.field, config.seasonality ?? 24, 0.3, config.threshold ?? 3.0);
        }
        return (0, anomaly_js_1.zScoreAnomalies)(series, config.field, config.window ?? 30, config.threshold ?? 3.5);
    }
    runForecast(series, config) {
        const values = series.map((row) => row.values[config.field]).filter((value) => typeof value === 'number');
        if (!values.length)
            return [];
        if (config.model === 'prophet') {
            return (0, forecast_js_1.prophetForecast)(series, config.field, config.horizon);
        }
        const predictions = (0, forecast_js_1.arimaForecast)(values, config.horizon);
        const cadence = series.length >= 2
            ? series[1].timestamp.getTime() - series[0].timestamp.getTime()
            : 60_000;
        const lastTimestamp = series[series.length - 1].timestamp.getTime();
        return predictions.map((prediction, idx) => {
            const timestamp = new Date(lastTimestamp + (idx + 1) * cadence);
            return { timestamp, predicted: prediction, lower: prediction * 0.9, upper: prediction * 1.1 };
        });
    }
    applyDownsampling(series, config) {
        if (!config || !series.length)
            return series;
        if (config.strategy === 'average' && config.bucketSize) {
            return (0, downsampling_js_1.downsampleAverage)(series, config.bucketSize);
        }
        if (config.strategy === 'lttb' && config.targetPoints) {
            return (0, downsampling_js_1.largestTriangleThreeBuckets)(series, config.targetPoints);
        }
        return series;
    }
    requireConnector(name) {
        const connector = this.connectors[name ?? this.defaultConnector];
        if (!connector) {
            throw new Error(`Connector ${name ?? this.defaultConnector} not configured`);
        }
        return connector;
    }
}
exports.TimeSeriesEngine = TimeSeriesEngine;
exports.__private__ = {
    durationToMs,
};
function durationToMs(window) {
    const match = window.every.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) {
        throw new Error(`Invalid duration: ${window.every}`);
    }
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
        case 'ms':
            return value;
        case 's':
            return value * 1000;
        case 'm':
            return value * 60_000;
        case 'h':
            return value * 3_600_000;
        case 'd':
            return value * 86_400_000;
        default:
            throw new Error(`Unsupported duration unit: ${unit}`);
    }
}
