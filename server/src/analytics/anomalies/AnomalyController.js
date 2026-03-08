"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnomalies = exports.runAnomalyDetection = void 0;
const AnomalyDetector_js_1 = require("./AnomalyDetector.js");
// In-memory store for demo. In production, read from DB/TimeSeries store.
const metricHistory = {};
const runAnomalyDetection = (req, res) => {
    const { metric, value, detector = 'zscore' } = req.body;
    if (!metric || value === undefined) {
        return res.status(400).json({ error: 'metric and value required' });
    }
    const history = metricHistory[metric] || [];
    let anomaly = null;
    // Run detector
    if (detector === 'zscore') {
        anomaly = AnomalyDetector_js_1.AnomalyDetector.detectZScore(metric, history, value);
    }
    else if (detector === 'mad') {
        anomaly = AnomalyDetector_js_1.AnomalyDetector.detectMAD(metric, history, value);
    }
    else if (detector === 'ratio') {
        anomaly = AnomalyDetector_js_1.AnomalyDetector.detectRatio(metric, history, value);
    }
    // Update history
    history.push({ timestamp: Date.now(), value });
    if (history.length > 100)
        history.shift(); // Keep window small for demo
    metricHistory[metric] = history;
    res.json({
        metric,
        value,
        anomaly: anomaly || 'none'
    });
};
exports.runAnomalyDetection = runAnomalyDetection;
const getAnomalies = (req, res) => {
    // Return all detected anomalies?
    // For MVP just return 'ok' as we don't persist anomalies in a list here, just real-time detection
    res.json({ status: 'ok', msg: 'Check /run output for specific checks' });
};
exports.getAnomalies = getAnomalies;
