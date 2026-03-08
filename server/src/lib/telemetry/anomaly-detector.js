"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anomalyDetector = void 0;
const diagnostic_snapshotter_js_1 = require("./diagnostic-snapshotter.js");
const alerting_service_js_1 = require("./alerting-service.js");
const correlation_engine_js_1 = require("./correlation-engine.js");
class AnomalyDetector {
    metricBaselines = new Map();
    metricData = new Map();
    processMetric(metricName, value) {
        if (!this.metricData.has(metricName)) {
            this.metricData.set(metricName, []);
        }
        const data = this.metricData.get(metricName);
        if (this.metricBaselines.has(metricName)) {
            this.detectAnomalies(metricName, value);
        }
        data.push(value);
        if (data.length > 100) {
            this.updateBaseline(metricName, data);
            this.metricData.set(metricName, []);
        }
    }
    updateBaseline(metricName, data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const std = Math.sqrt(data.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) /
            data.length);
        const existingBaseline = this.metricBaselines.get(metricName);
        if (existingBaseline) {
            this.metricBaselines.set(metricName, {
                mean: existingBaseline.mean * 0.9 + mean * 0.1,
                std: existingBaseline.std * 0.9 + std * 0.1,
            });
        }
        else {
            this.metricBaselines.set(metricName, { mean, std });
        }
    }
    detectAnomalies(metricName, value) {
        const baseline = this.metricBaselines.get(metricName);
        if (!baseline || baseline.std === 0) {
            return;
        }
        const zScore = (value - baseline.mean) / baseline.std;
        if (Math.abs(zScore) > 3) {
            this.triggerAlert(metricName, value, zScore);
        }
    }
    triggerAlert(metricName, value, zScore) {
        const alertMessage = `Anomaly detected in ${metricName}: value=${value}, z-score=${zScore}`;
        // Automatically correlate logs and traces for this anomaly
        const correlationReport = correlation_engine_js_1.correlationEngine.analyze(metricName);
        alerting_service_js_1.alertingService.sendAlert(alertMessage, correlationReport);
        diagnostic_snapshotter_js_1.snapshotter.triggerSnapshot(`anomaly_detected_${metricName}`);
    }
}
exports.anomalyDetector = new AnomalyDetector();
