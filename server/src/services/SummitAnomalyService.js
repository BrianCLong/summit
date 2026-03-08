"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summitAnomalyService = exports.SummitAnomalyService = void 0;
const temporal_js_1 = require("../anomaly/detectors/temporal.js");
const spatial_js_1 = require("../anomaly/detectors/spatial.js");
const network_js_1 = require("../anomaly/detectors/network.js");
const behavioral_js_1 = require("../anomaly/detectors/behavioral.js");
const alerting_service_js_1 = require("../lib/telemetry/alerting-service.js");
class SummitAnomalyService {
    static instance;
    detectors = new Map();
    whitelist = new Set(); // Stores IDs of known false positives
    constructor() {
        this.registerDetector(new temporal_js_1.TemporalDetector());
        this.registerDetector(new spatial_js_1.SpatialDetector());
        this.registerDetector(new network_js_1.NetworkDetector());
        this.registerDetector(new behavioral_js_1.BehavioralDetector());
    }
    static getInstance() {
        if (!SummitAnomalyService.instance) {
            SummitAnomalyService.instance = new SummitAnomalyService();
        }
        return SummitAnomalyService.instance;
    }
    registerDetector(detector) {
        this.detectors.set(detector.type, detector);
    }
    async analyze(context) {
        const detector = this.detectors.get(context.type);
        if (!detector) {
            console.warn(`No detector registered for type: ${context.type}`);
            return null;
        }
        try {
            const result = await detector.detect(context);
            // Check whitelist (False Positive Reduction)
            const anomalyId = this.generateAnomalyId(context);
            if (this.whitelist.has(anomalyId)) {
                return { ...result, isAnomaly: false, score: 0, explanation: { description: 'Suppressed by whitelist', contributingFactors: [] } };
            }
            if (result.isAnomaly) {
                // Automated Alerting
                this.triggerAlert(result);
            }
            return result;
        }
        catch (error) {
            console.error('Error during anomaly detection:', error);
            return null;
        }
    }
    reportFeedback(feedback) {
        if (feedback.isFalsePositive) {
            this.whitelist.add(feedback.anomalyId);
            console.log(`[AnomalyService] Whitelisted anomaly ${feedback.anomalyId}`);
        }
        else {
            // Logic to reinforce model could go here
            console.log(`[AnomalyService] Confirmed anomaly ${feedback.anomalyId}`);
        }
    }
    triggerAlert(result) {
        // Integrate with existing alerting service
        const message = `[${result.severity.toUpperCase()}] ${result.type} Anomaly detected for ${result.entityId}`;
        alerting_service_js_1.alertingService.sendAlert(message, {
            explanation: result.explanation,
            score: result.score,
            timestamp: result.timestamp
        });
    }
    generateAnomalyId(context) {
        // Simple hash for demo purposes. In production, use a proper hash.
        // We bind it to entity and type, but maybe not timestamp if we want to suppress persistent issues?
        // If we want to suppress *this specific instance*, we include timestamp.
        // If we want to suppress "this type of behavior for this entity", we exclude timestamp.
        // Let's assume we want to suppress specific instances for now, or maybe short-term suppression.
        return `${context.type}:${context.entityId}`;
    }
    // Helper for testing
    _resetForTesting() {
        this.whitelist.clear();
    }
}
exports.SummitAnomalyService = SummitAnomalyService;
exports.summitAnomalyService = SummitAnomalyService.getInstance();
