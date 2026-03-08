"use strict";
/**
 * Canonical Event Model for Summit Notifications & Integrations Hub
 *
 * This schema defines a unified event structure that all systems in Summit
 * can emit and consume. Events flow through the notification hub which routes
 * them to appropriate receivers based on severity, tenant, and user preferences.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHelpers = exports.EventBuilder = exports.EventStatus = exports.EventSeverity = exports.EventType = void 0;
var EventType;
(function (EventType) {
    // Alerting & SLO
    EventType["ALERT_TRIGGERED"] = "alert.triggered";
    EventType["ALERT_RESOLVED"] = "alert.resolved";
    EventType["ALERT_ESCALATED"] = "alert.escalated";
    EventType["SLO_VIOLATION"] = "slo.violation";
    EventType["SLO_ERROR_BUDGET_DEPLETED"] = "slo.error_budget_depleted";
    // Pipeline & Orchestration
    EventType["PIPELINE_STARTED"] = "pipeline.started";
    EventType["PIPELINE_COMPLETED"] = "pipeline.completed";
    EventType["PIPELINE_FAILED"] = "pipeline.failed";
    EventType["WORKFLOW_APPROVAL_REQUIRED"] = "workflow.approval_required";
    EventType["WORKFLOW_APPROVED"] = "workflow.approved";
    EventType["WORKFLOW_REJECTED"] = "workflow.rejected";
    // Two-Person Control / Authority
    EventType["AUTHORITY_APPROVAL_REQUIRED"] = "authority.approval_required";
    EventType["AUTHORITY_APPROVED"] = "authority.approved";
    EventType["AUTHORITY_REJECTED"] = "authority.rejected";
    EventType["AUTHORITY_DISSENT"] = "authority.dissent";
    EventType["AUTHORITY_TIMEOUT"] = "authority.timeout";
    // Copilot & AI
    EventType["COPILOT_RUN_STARTED"] = "copilot.run_started";
    EventType["COPILOT_RUN_COMPLETED"] = "copilot.run_completed";
    EventType["COPILOT_RUN_FAILED"] = "copilot.run_failed";
    EventType["COPILOT_ESCALATION"] = "copilot.escalation";
    EventType["COPILOT_ANOMALY_DETECTED"] = "copilot.anomaly_detected";
    // Investigation & Evidence
    EventType["INVESTIGATION_CREATED"] = "investigation.created";
    EventType["INVESTIGATION_UPDATED"] = "investigation.updated";
    EventType["INVESTIGATION_SHARED"] = "investigation.shared";
    EventType["EVIDENCE_ADDED"] = "evidence.added";
    EventType["ENTITY_DISCOVERED"] = "entity.discovered";
    EventType["ENTITY_RISK_CHANGED"] = "entity.risk_changed";
    // Security & Compliance
    EventType["SECURITY_ALERT"] = "security.alert";
    EventType["POLICY_VIOLATION"] = "policy.violation";
    EventType["ACCESS_DENIED"] = "security.access_denied";
    EventType["CLEARANCE_VIOLATION"] = "security.clearance_violation";
    EventType["LICENSE_VIOLATION"] = "license.violation";
    // System & Infrastructure
    EventType["SYSTEM_HEALTH_DEGRADED"] = "system.health_degraded";
    EventType["SYSTEM_MAINTENANCE_SCHEDULED"] = "system.maintenance_scheduled";
    EventType["GOLDEN_PATH_BROKEN"] = "system.golden_path_broken";
    EventType["DEPLOYMENT_COMPLETED"] = "deployment.completed";
    EventType["DEPLOYMENT_FAILED"] = "deployment.failed";
    // Notification lifecycle
    EventType["NOTIFICATION_DIGEST"] = "notification.digest";
    // Budget & Cost
    EventType["BUDGET_THRESHOLD_EXCEEDED"] = "budget.threshold_exceeded";
    EventType["BUDGET_DEPLETED"] = "budget.depleted";
    EventType["COST_ANOMALY"] = "cost.anomaly";
    // User & Collaboration
    EventType["USER_MENTIONED"] = "user.mentioned";
    EventType["COLLABORATION_INVITE"] = "collaboration.invite";
    EventType["REPORT_READY"] = "report.ready";
})(EventType || (exports.EventType = EventType = {}));
var EventSeverity;
(function (EventSeverity) {
    EventSeverity["CRITICAL"] = "critical";
    EventSeverity["HIGH"] = "high";
    EventSeverity["MEDIUM"] = "medium";
    EventSeverity["LOW"] = "low";
    EventSeverity["INFO"] = "info";
})(EventSeverity || (exports.EventSeverity = EventSeverity = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["PENDING"] = "pending";
    EventStatus["PROCESSING"] = "processing";
    EventStatus["DELIVERED"] = "delivered";
    EventStatus["FAILED"] = "failed";
    EventStatus["EXPIRED"] = "expired";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
/**
 * Event Builder for creating canonical events
 */
class EventBuilder {
    event;
    constructor() {
        this.event = {
            id: this.generateEventId(),
            version: '1.0.0',
            timestamp: new Date(),
            status: EventStatus.PENDING,
            payload: {},
            metadata: {},
        };
    }
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    type(type) {
        this.event.type = type;
        return this;
    }
    actor(actor) {
        this.event.actor = actor;
        return this;
    }
    subject(subject) {
        this.event.subject = subject;
        return this;
    }
    context(context) {
        this.event.context = context;
        return this;
    }
    severity(severity) {
        this.event.severity = severity;
        return this;
    }
    title(title) {
        this.event.title = title;
        return this;
    }
    message(message) {
        this.event.message = message;
        return this;
    }
    payload(payload) {
        this.event.payload = { ...this.event.payload, ...payload };
        return this;
    }
    metadata(metadata) {
        this.event.metadata = { ...this.event.metadata, ...metadata };
        return this;
    }
    expiresAt(date) {
        this.event.expiresAt = date;
        return this;
    }
    correlationId(id) {
        if (!this.event.metadata)
            this.event.metadata = {};
        this.event.metadata.correlationId = id;
        return this;
    }
    source(source) {
        if (!this.event.metadata)
            this.event.metadata = {};
        this.event.metadata.source = source;
        return this;
    }
    addLink(rel, href, title) {
        if (!this.event.metadata)
            this.event.metadata = {};
        if (!this.event.metadata.links)
            this.event.metadata.links = [];
        this.event.metadata.links.push({ rel, href, title });
        return this;
    }
    build() {
        // Validate required fields
        if (!this.event.type)
            throw new Error('Event type is required');
        if (!this.event.actor)
            throw new Error('Event actor is required');
        if (!this.event.subject)
            throw new Error('Event subject is required');
        if (!this.event.context)
            throw new Error('Event context is required');
        if (!this.event.severity)
            throw new Error('Event severity is required');
        if (!this.event.title)
            throw new Error('Event title is required');
        if (!this.event.message)
            throw new Error('Event message is required');
        return this.event;
    }
}
exports.EventBuilder = EventBuilder;
/**
 * Helper functions for common event patterns
 */
exports.EventHelpers = {
    /**
     * Create a system actor
     */
    systemActor(serviceName) {
        return {
            id: 'system',
            type: 'system',
            name: serviceName,
            metadata: {
                version: process.env.APP_VERSION || 'unknown',
            },
        };
    },
    /**
     * Create a user actor
     */
    userActor(userId, name, email) {
        return {
            id: userId,
            type: 'user',
            name,
            email,
        };
    },
    /**
     * Create a service actor
     */
    serviceActor(serviceName, serviceId) {
        return {
            id: serviceId || serviceName,
            type: 'service',
            name: serviceName,
        };
    },
    /**
     * Create a copilot actor
     */
    copilotActor(copilotId, copilotName) {
        return {
            id: copilotId,
            type: 'copilot',
            name: copilotName,
        };
    },
    /**
     * Map alert severity to event severity
     */
    alertSeverityToEventSeverity(alertSeverity) {
        const mapping = {
            critical: EventSeverity.CRITICAL,
            high: EventSeverity.HIGH,
            warning: EventSeverity.MEDIUM,
            info: EventSeverity.INFO,
            low: EventSeverity.LOW,
        };
        return mapping[alertSeverity.toLowerCase()] || EventSeverity.MEDIUM;
    },
};
