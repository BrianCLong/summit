"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDashboard = buildDashboard;
function buildDashboard(name, observed, anomalies, forecast, description) {
    const observedPanel = {
        id: 'observed',
        title: 'Observed Signals',
        type: 'line',
        series: normalizeRows(observed),
        annotations: anomalies.map((item) => ({ x: item.timestamp, label: `z=${item.zScore.toFixed(2)}` })),
    };
    const forecastPanel = {
        id: 'forecast',
        title: 'Forecast Horizon',
        type: 'area',
        series: [
            {
                label: 'predicted',
                points: forecast.map((point) => ({ x: point.timestamp, y: point.predicted })),
            },
            {
                label: 'lower',
                points: forecast.map((point) => ({ x: point.timestamp, y: point.lower })),
            },
            {
                label: 'upper',
                points: forecast.map((point) => ({ x: point.timestamp, y: point.upper })),
            },
        ],
    };
    return {
        name,
        description,
        panels: [observedPanel, forecastPanel],
    };
}
function normalizeRows(rows) {
    const fields = new Set();
    rows.forEach((row) => Object.keys(row.values).forEach((field) => fields.add(field)));
    return Array.from(fields).map((field) => ({
        label: field,
        points: rows.map((row) => ({ x: row.timestamp, y: row.values[field] ?? 0 })),
    }));
}
