"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.siemPlatform = exports.SIEMPlatform = void 0;
const rules_js_1 = require("./rules.js");
const AnomalyDetector_js_1 = require("./AnomalyDetector.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const crypto_1 = require("crypto");
class SIEMPlatform {
    events = [];
    alerts = [];
    rules = rules_js_1.defaultRules;
    // In-memory buffer for correlation (sliding window)
    eventBuffer = [];
    // Storage limit for in-memory prototype
    MAX_EVENTS = 10000;
    MAX_ALERTS = 1000;
    constructor() {
        // Start periodic cleanup/processing if needed
        const timer = setInterval(() => this.cleanupBuffer(), 60000);
        // Unref the timer so it doesn't prevent process exit during tests
        if (timer.unref) {
            timer.unref();
        }
    }
    async ingestEvent(eventData) {
        const event = {
            id: eventData.id || (0, crypto_1.randomUUID)(),
            timestamp: eventData.timestamp || new Date(),
            eventType: eventData.eventType || 'unknown',
            source: eventData.source || 'unknown',
            severity: eventData.severity || 'low',
            message: eventData.message || '',
            details: eventData.details || {},
            userId: eventData.userId,
            tenantId: eventData.tenantId,
            ipAddress: eventData.ipAddress,
            userAgent: eventData.userAgent,
            tags: eventData.tags || []
        };
        // 1. Store Event
        this.storeEvent(event);
        // 2. Real-time Correlation
        await this.correlate(event);
        // 3. Anomaly Detection
        const anomaly = AnomalyDetector_js_1.anomalyDetector.trackAndScore(event);
        if (anomaly) {
            await this.createAlert({
                ruleId: 'anomaly-detection',
                severity: 'medium',
                title: 'Anomaly Detected',
                description: `Anomaly detected for ${anomaly.entityId}: ${anomaly.factors.join(', ')}`,
                events: [event],
                tenantId: event.tenantId
            });
        }
        return event;
    }
    storeEvent(event) {
        this.events.push(event);
        this.eventBuffer.push(event);
        if (this.events.length > this.MAX_EVENTS) {
            this.events.shift();
        }
    }
    async correlate(newEvent) {
        for (const rule of this.rules) {
            if (!rule.enabled)
                continue;
            // Filter events matching the rule conditions within the time window
            const windowStart = new Date(Date.now() - rule.windowSeconds * 1000);
            const relevantEvents = this.eventBuffer.filter(e => e.timestamp >= windowStart &&
                this.matchesConditions(e, rule.conditions));
            // Add the new event if it matches (it might be in buffer already, but ensure it's counted)
            // Note: eventBuffer includes newEvent.
            // Group by correlation key (e.g., source IP or User ID)
            // For simplicity, we check if the TOTAL count in window exceeds threshold.
            // In a real system, we'd group by `rule.groupBy` field.
            // Assuming 'ipAddress' or 'userId' is the grouping key if present.
            const groupBy = newEvent.ipAddress || newEvent.userId || 'global';
            const eventsForGroup = relevantEvents.filter(e => (e.ipAddress === groupBy) || (e.userId === groupBy) || groupBy === 'global');
            if (eventsForGroup.length >= rule.threshold) {
                // Check if we recently alerted on this to avoid spam
                const recentAlert = this.alerts.find(a => a.ruleId === rule.id &&
                    a.timestamp > windowStart &&
                    // Rudimentary check to see if it's the same entity
                    (a.description.includes(groupBy)));
                if (!recentAlert) {
                    await this.createAlert({
                        ruleId: rule.id,
                        severity: rule.severity,
                        title: rule.name,
                        description: `${rule.description}. Detected ${eventsForGroup.length} events for ${groupBy}`,
                        events: eventsForGroup,
                        tenantId: newEvent.tenantId
                    });
                }
            }
        }
    }
    matchesConditions(event, conditions) {
        return conditions.every(condition => {
            const eventRecord = event;
            const val = eventRecord[condition.field]; // Simple field access
            if (val === undefined)
                return false;
            switch (condition.operator) {
                case 'equals': return val === condition.value;
                case 'contains': return String(val).includes(String(condition.value));
                case 'regex': return new RegExp(String(condition.value)).test(String(val));
                default: return false;
            }
        });
    }
    async createAlert(alertData) {
        const alert = {
            id: (0, crypto_1.randomUUID)(),
            ruleId: alertData.ruleId,
            severity: alertData.severity || 'medium',
            title: alertData.title,
            description: alertData.description,
            timestamp: new Date(),
            events: alertData.events || [],
            status: 'new',
            tenantId: alertData.tenantId
        };
        this.alerts.push(alert);
        if (this.alerts.length > this.MAX_ALERTS) {
            this.alerts.shift();
        }
        logger_js_1.default.warn('SIEM Alert Triggered', { alert });
        // Execute Actions (Mock)
        // if (rule.actions.includes('webhook')) ...
    }
    cleanupBuffer() {
        const cutoff = new Date(Date.now() - 3600 * 1000); // Keep 1 hour in buffer
        this.eventBuffer = this.eventBuffer.filter(e => e.timestamp > cutoff);
    }
    // Public Query Methods
    getEvents(_filter) {
        // Basic filter impl
        return this.events.slice().reverse();
    }
    getAlerts(_filter) {
        return this.alerts.slice().reverse();
    }
    reset() {
        this.events = [];
        this.alerts = [];
        this.eventBuffer = [];
        AnomalyDetector_js_1.anomalyDetector.reset();
    }
}
exports.SIEMPlatform = SIEMPlatform;
exports.siemPlatform = new SIEMPlatform();
