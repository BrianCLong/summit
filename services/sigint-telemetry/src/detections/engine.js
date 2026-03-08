"use strict";
/**
 * Detection Engine Core
 *
 * Executes detection rules against telemetry events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionEngine = void 0;
exports.createDetectionEngine = createDetectionEngine;
const uuid_1 = require("uuid");
const defaultConfig = {
    minConfidence: 0.5,
    maxDetectionsPerEvent: 10,
    enableAll: true,
};
/** Detection engine */
class DetectionEngine {
    rules = new Map();
    config;
    constructor(config = {}) {
        this.config = { ...defaultConfig, ...config };
    }
    /** Register a detection rule */
    registerRule(rule) {
        this.rules.set(rule.id, rule);
    }
    /** Register multiple rules */
    registerRules(rules) {
        for (const rule of rules) {
            this.registerRule(rule);
        }
    }
    /** Enable a rule by ID */
    enableRule(ruleId) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = true;
        }
    }
    /** Disable a rule by ID */
    disableRule(ruleId) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = false;
        }
    }
    /** Get all registered rules */
    getRules() {
        return Array.from(this.rules.values());
    }
    /** Get enabled rules */
    getEnabledRules() {
        return this.getRules().filter((r) => r.enabled);
    }
    /** Evaluate a single event against all enabled rules */
    evaluate(event) {
        const results = [];
        const eventType = event?.eventType;
        if (!eventType) {
            return results;
        }
        for (const rule of this.getEnabledRules()) {
            // Skip if rule doesn't apply to this event type
            if (!rule.eventTypes.includes(eventType) && !rule.eventTypes.includes('*')) {
                continue;
            }
            try {
                const confidence = rule.evaluate(event);
                if (confidence !== null && confidence >= this.config.minConfidence) {
                    results.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        severity: rule.severity,
                        confidence,
                        matchedFields: [], // Could be enhanced to track matched fields
                        description: rule.description,
                        mitreTactics: rule.mitreTactics,
                        mitreTechniques: rule.mitreTechniques,
                    });
                    if (results.length >= this.config.maxDetectionsPerEvent) {
                        break;
                    }
                }
            }
            catch (error) {
                // Log but don't fail on rule errors
                console.warn(`Rule ${rule.id} evaluation failed:`, error);
            }
        }
        return results;
    }
    /** Evaluate multiple events */
    evaluateBatch(events) {
        const results = new Map();
        for (const event of events) {
            const eventId = event?.id ?? (0, uuid_1.v4)();
            const detections = this.evaluate(event);
            if (detections.length > 0) {
                results.set(eventId, detections);
            }
        }
        return results;
    }
    /** Get detection statistics */
    getStats(results) {
        const stats = {
            totalEvents: 0,
            eventsWithDetections: results.size,
            totalDetections: 0,
            bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
            byRule: {},
        };
        for (const detections of results.values()) {
            stats.totalDetections += detections.length;
            for (const detection of detections) {
                stats.bySeverity[detection.severity]++;
                stats.byRule[detection.ruleId] = (stats.byRule[detection.ruleId] ?? 0) + 1;
            }
        }
        return stats;
    }
}
exports.DetectionEngine = DetectionEngine;
/** Create a new detection engine with default rules */
function createDetectionEngine(config) {
    return new DetectionEngine(config);
}
