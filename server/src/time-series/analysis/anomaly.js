"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zScoreAnomalies = zScoreAnomalies;
exports.seasonalEwmaAnomalies = seasonalEwmaAnomalies;
const anomaly_js_1 = require("../../anomaly.js");
function zScoreAnomalies(rows, field, window = 30, threshold = 3.5) {
    const anomalies = [];
    const values = [];
    for (const row of rows) {
        const value = row.values[field];
        if (typeof value !== 'number')
            continue;
        if (values.length >= window) {
            const { anomaly, z } = (0, anomaly_js_1.detectAnomalySeries)(values.slice(-window), value);
            if (anomaly && Math.abs(z) >= threshold) {
                anomalies.push({ timestamp: row.timestamp, value, zScore: z });
            }
        }
        values.push(value);
    }
    return anomalies;
}
function seasonalEwmaAnomalies(rows, field, seasonality, alpha = 0.3, threshold = 3.0) {
    if (!rows.length || seasonality <= 1)
        return [];
    const smoothed = [];
    const anomalies = [];
    for (let i = 0; i < rows.length; i += 1) {
        const value = rows[i].values[field];
        if (typeof value !== 'number')
            continue;
        if (i < seasonality) {
            smoothed.push(value);
            continue;
        }
        const seasonalBaseline = smoothed[i - seasonality];
        const level = (0, anomaly_js_1.ewma)(seasonalBaseline, value, alpha);
        const deviation = Math.abs(value - level);
        const normalized = seasonalBaseline === 0 ? 0 : deviation / Math.max(1, Math.abs(seasonalBaseline));
        if (normalized >= threshold) {
            anomalies.push({ timestamp: rows[i].timestamp, value, zScore: normalized });
        }
        smoothed.push(level);
    }
    return anomalies;
}
