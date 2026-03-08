"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditSink = exports.AuditSink = void 0;
const index_js_1 = require("./index.js");
/**
 * Production Audit Sink implementation that routes events to the AdvancedAuditSystem.
 * It provides a clean API for common audit patterns.
 */
class AuditSink {
    async recordEvent(event) {
        // In dev/test without full DB setup, we can fallback to console or pino
        // But here we route to the sophisticated system.
        return index_js_1.advancedAuditSystem.recordEvent(event);
    }
    async securityAlert(message, details) {
        return this.recordEvent({
            eventType: 'security_alert',
            level: 'critical',
            action: 'security_alert_triggered',
            message,
            details,
            complianceRelevant: true,
        });
    }
    async complianceEvent(framework, message, details) {
        return this.recordEvent({
            eventType: 'user_action',
            level: 'info',
            action: 'compliance_event_recorded',
            message,
            details,
            complianceRelevant: true,
            complianceFrameworks: [framework],
        });
    }
}
exports.AuditSink = AuditSink;
/**
 * Singleton instance of the Audit Sink.
 */
exports.auditSink = new AuditSink();
