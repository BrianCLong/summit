"use strict";
/**
 * Event Adapters for System Integrations
 *
 * These adapters convert system-specific events into canonical events
 * that can be processed by the Notification Hub.
 *
 * Integrations:
 * - Alerting & SLO System
 * - Pipeline Orchestrator (Temporal/Conductor)
 * - Copilot & AI Runs
 * - Two-Person Control / Authority Workflows
 * - Investigation & Evidence Events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterRegistry = exports.InvestigationEventAdapter = exports.AuthorityEventAdapter = exports.CopilotEventAdapter = exports.PipelineEventAdapter = exports.AlertingEventAdapter = void 0;
const EventSchema_js_1 = require("../events/EventSchema.js");
/**
 * Alerting & SLO Event Adapter
 *
 * Converts alerts and SLO violations into canonical events
 */
class AlertingEventAdapter {
    hub = null;
    initialized = false;
    async initialize(hub) {
        this.hub = hub;
        this.initialized = true;
        // In production, this would subscribe to alert events from the alerting system
        // For now, we provide methods to be called by the alerting system
    }
    /**
     * Handle alert triggered event
     */
    async handleAlertTriggered(alertData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.ALERT_TRIGGERED)
            .severity(EventSchema_js_1.EventHelpers.alertSeverityToEventSeverity(alertData.severity))
            .actor(EventSchema_js_1.EventHelpers.systemActor('Alerting System'))
            .subject({
            type: 'alert',
            id: alertData.id,
            name: alertData.name,
            url: alertData.dashboardUrl,
        })
            .context({
            tenantId: alertData.tenantId,
            projectId: alertData.projectId,
            environment: alertData.environment,
            tags: alertData.labels,
        })
            .title(`Alert: ${alertData.name}`)
            .message(`${alertData.message} (current: ${alertData.value}, threshold: ${alertData.threshold})`)
            .payload({
            alertId: alertData.id,
            query: alertData.query,
            value: alertData.value,
            threshold: alertData.threshold,
            labels: alertData.labels,
        })
            .source('alerting-system')
            .build();
        await this.hub.notify(event);
    }
    /**
     * Handle SLO violation event
     */
    async handleSLOViolation(sloData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const severity = sloData.errorBudgetRemaining <= 0
            ? EventSchema_js_1.EventSeverity.CRITICAL
            : sloData.errorBudgetRemaining < 0.1
                ? EventSchema_js_1.EventSeverity.HIGH
                : EventSchema_js_1.EventSeverity.MEDIUM;
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.SLO_VIOLATION)
            .severity(severity)
            .actor(EventSchema_js_1.EventHelpers.systemActor('SLO Monitor'))
            .subject({
            type: 'slo',
            id: sloData.id,
            name: sloData.name,
            url: sloData.dashboardUrl,
        })
            .context({
            tenantId: sloData.tenantId,
            projectId: sloData.projectId,
            tags: { service: sloData.service },
        })
            .title(`SLO Violation: ${sloData.name}`)
            .message(`Error budget ${(sloData.errorBudgetRemaining * 100).toFixed(2)}% remaining (burn rate: ${sloData.burnRate.toFixed(2)}x)`)
            .payload({
            sloId: sloData.id,
            errorBudget: sloData.errorBudget,
            errorBudgetRemaining: sloData.errorBudgetRemaining,
            burnRate: sloData.burnRate,
            service: sloData.service,
        })
            .source('slo-monitor')
            .build();
        await this.hub.notify(event);
    }
    /**
     * Handle golden path broken event
     */
    async handleGoldenPathBroken(pathData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.GOLDEN_PATH_BROKEN)
            .severity(pathData.environment === 'production'
            ? EventSchema_js_1.EventSeverity.CRITICAL
            : EventSchema_js_1.EventSeverity.HIGH)
            .actor(EventSchema_js_1.EventHelpers.systemActor('Golden Path Monitor'))
            .subject({
            type: 'golden_path',
            id: pathData.name,
            name: pathData.name,
            url: pathData.runUrl,
        })
            .context({
            tenantId: pathData.tenantId,
            projectId: pathData.projectId,
            environment: pathData.environment,
            tags: { stage: pathData.stage },
        })
            .title(`Golden Path Broken: ${pathData.name} in ${pathData.environment}`)
            .message(`Stage '${pathData.stage}' failed: ${pathData.reason}`)
            .payload({
            path: pathData.name,
            stage: pathData.stage,
            environment: pathData.environment,
            reason: pathData.reason,
        })
            .source('golden-path-monitor')
            .build();
        await this.hub.notify(event);
    }
    async shutdown() {
        this.hub = null;
        this.initialized = false;
    }
    async healthCheck() {
        return this.initialized;
    }
}
exports.AlertingEventAdapter = AlertingEventAdapter;
/**
 * Pipeline Orchestrator Event Adapter
 *
 * Converts pipeline/workflow events into canonical events
 */
class PipelineEventAdapter {
    hub = null;
    initialized = false;
    async initialize(hub) {
        this.hub = hub;
        this.initialized = true;
    }
    /**
     * Handle pipeline failure event
     */
    async handlePipelineFailure(pipelineData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.PIPELINE_FAILED)
            .severity(EventSchema_js_1.EventSeverity.HIGH)
            .actor(pipelineData.userId
            ? EventSchema_js_1.EventHelpers.userActor(pipelineData.userId, pipelineData.userName || 'Unknown')
            : EventSchema_js_1.EventHelpers.systemActor('Pipeline Orchestrator'))
            .subject({
            type: 'pipeline',
            id: pipelineData.id,
            name: pipelineData.name,
            url: pipelineData.pipelineUrl,
        })
            .context({
            tenantId: pipelineData.tenantId,
            projectId: pipelineData.projectId,
            tags: { runId: pipelineData.runId },
        })
            .title(`Pipeline Failed: ${pipelineData.name}`)
            .message(`Stage '${pipelineData.failedStage}' failed: ${pipelineData.error}`)
            .payload({
            pipelineId: pipelineData.id,
            runId: pipelineData.runId,
            failedStage: pipelineData.failedStage,
            error: pipelineData.error,
        })
            .source('pipeline-orchestrator')
            .build();
        await this.hub.notify(event);
    }
    /**
     * Handle workflow approval required event
     */
    async handleWorkflowApprovalRequired(workflowData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.WORKFLOW_APPROVAL_REQUIRED)
            .severity(EventSchema_js_1.EventSeverity.HIGH)
            .actor(EventSchema_js_1.EventHelpers.userActor(workflowData.requester.id, workflowData.requester.name, workflowData.requester.email))
            .subject({
            type: 'workflow',
            id: workflowData.id,
            name: workflowData.name,
            url: workflowData.approvalUrl,
        })
            .context({
            tenantId: workflowData.tenantId,
            projectId: workflowData.projectId,
        })
            .title(`Approval Required: ${workflowData.name}`)
            .message(`${workflowData.requester.name} requests approval: ${workflowData.reason}`)
            .payload({
            workflowId: workflowData.id,
            requester: workflowData.requester,
            approvers: workflowData.approvers,
            reason: workflowData.reason,
        })
            .expiresAt(workflowData.expiresAt)
            .source('workflow-orchestrator')
            .addLink('approve', `${workflowData.approvalUrl}/approve`, 'Approve Workflow')
            .addLink('reject', `${workflowData.approvalUrl}/reject`, 'Reject Workflow')
            .build();
        await this.hub.notify(event);
    }
    async shutdown() {
        this.hub = null;
        this.initialized = false;
    }
    async healthCheck() {
        return this.initialized;
    }
}
exports.PipelineEventAdapter = PipelineEventAdapter;
/**
 * Copilot Event Adapter
 *
 * Converts copilot/AI events into canonical events
 */
class CopilotEventAdapter {
    hub = null;
    initialized = false;
    async initialize(hub) {
        this.hub = hub;
        this.initialized = true;
    }
    /**
     * Handle copilot escalation event
     */
    async handleCopilotEscalation(escalationData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.COPILOT_ESCALATION)
            .severity(EventSchema_js_1.EventSeverity.HIGH)
            .actor(EventSchema_js_1.EventHelpers.copilotActor(escalationData.copilotName, escalationData.copilotName))
            .subject({
            type: 'copilot_run',
            id: escalationData.runId,
            name: escalationData.copilotName,
            url: escalationData.runUrl,
        })
            .context({
            tenantId: escalationData.tenantId,
            projectId: escalationData.projectId,
        })
            .title(`Copilot Escalation: ${escalationData.copilotName}`)
            .message(`Copilot requires human intervention: ${escalationData.reason}`)
            .payload({
            runId: escalationData.runId,
            copilotName: escalationData.copilotName,
            reason: escalationData.reason,
            context: escalationData.context,
        })
            .source('copilot-orchestrator')
            .build();
        await this.hub.notify(event);
    }
    /**
     * Handle copilot anomaly detected event
     */
    async handleCopilotAnomalyDetected(anomalyData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const severity = anomalyData.score >= 0.9
            ? EventSchema_js_1.EventSeverity.CRITICAL
            : anomalyData.score >= 0.7
                ? EventSchema_js_1.EventSeverity.HIGH
                : EventSchema_js_1.EventSeverity.MEDIUM;
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.COPILOT_ANOMALY_DETECTED)
            .severity(severity)
            .actor(EventSchema_js_1.EventHelpers.copilotActor(anomalyData.copilotName, anomalyData.copilotName))
            .subject({
            type: 'anomaly',
            id: anomalyData.runId,
            name: anomalyData.anomalyType,
            url: anomalyData.investigationUrl,
        })
            .context({
            tenantId: anomalyData.tenantId,
            projectId: anomalyData.projectId,
        })
            .title(`Anomaly Detected: ${anomalyData.anomalyType}`)
            .message(`${anomalyData.description} (score: ${(anomalyData.score * 100).toFixed(1)}%)`)
            .payload({
            runId: anomalyData.runId,
            copilotName: anomalyData.copilotName,
            anomalyType: anomalyData.anomalyType,
            score: anomalyData.score,
        })
            .source('copilot-anomaly-detector')
            .build();
        await this.hub.notify(event);
    }
    async shutdown() {
        this.hub = null;
        this.initialized = false;
    }
    async healthCheck() {
        return this.initialized;
    }
}
exports.CopilotEventAdapter = CopilotEventAdapter;
/**
 * Two-Person Control / Authority Event Adapter
 *
 * Converts authority/approval events into canonical events
 */
class AuthorityEventAdapter {
    hub = null;
    initialized = false;
    async initialize(hub) {
        this.hub = hub;
        this.initialized = true;
    }
    /**
     * Handle authority approval required event
     */
    async handleAuthorityApprovalRequired(authorityData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.AUTHORITY_APPROVAL_REQUIRED)
            .severity(EventSchema_js_1.EventSeverity.CRITICAL)
            .actor(EventSchema_js_1.EventHelpers.userActor(authorityData.requester.id, authorityData.requester.name, authorityData.requester.email))
            .subject({
            type: 'authority_request',
            id: authorityData.id,
            name: authorityData.operation,
            url: authorityData.approvalUrl,
        })
            .context({
            tenantId: authorityData.tenantId,
            projectId: authorityData.projectId,
        })
            .title(`Authority Required: ${authorityData.operation}`)
            .message(`${authorityData.requester.name} requires ${authorityData.requiredApprovers}-of-${authorityData.approvers.length} approval: ${authorityData.reason}`)
            .payload({
            authorityId: authorityData.id,
            operation: authorityData.operation,
            requester: authorityData.requester,
            requiredApprovers: authorityData.requiredApprovers,
            approvers: authorityData.approvers,
            reason: authorityData.reason,
        })
            .expiresAt(authorityData.expiresAt)
            .source('authority-system')
            .addLink('approve', `${authorityData.approvalUrl}/approve`, 'Approve Request')
            .addLink('reject', `${authorityData.approvalUrl}/reject`, 'Reject Request')
            .build();
        await this.hub.notify(event);
    }
    /**
     * Handle authority dissent event (Foster & Starkey dissent pattern)
     */
    async handleAuthorityDissent(dissentData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.AUTHORITY_DISSENT)
            .severity(EventSchema_js_1.EventSeverity.CRITICAL)
            .actor(EventSchema_js_1.EventHelpers.userActor(dissentData.dissenter.id, dissentData.dissenter.name))
            .subject({
            type: 'authority_dissent',
            id: dissentData.id,
            name: dissentData.operation,
            url: dissentData.reviewUrl,
        })
            .context({
            tenantId: dissentData.tenantId,
            projectId: dissentData.projectId,
        })
            .title(`Authority Dissent: ${dissentData.operation}`)
            .message(`${dissentData.dissenter.name} dissents: ${dissentData.reason}`)
            .payload({
            dissentId: dissentData.id,
            operation: dissentData.operation,
            dissenter: dissentData.dissenter,
            reason: dissentData.reason,
            originalApproval: dissentData.originalApproval,
        })
            .source('authority-system')
            .build();
        await this.hub.notify(event);
    }
    /**
     * Handle policy violation attempt
     */
    async handlePolicyViolation(violationData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.POLICY_VIOLATION)
            .severity(EventSchema_js_1.EventSeverity.CRITICAL)
            .actor(EventSchema_js_1.EventHelpers.userActor(violationData.user.id, violationData.user.name, violationData.user.email))
            .subject({
            type: 'policy_violation',
            id: violationData.id,
            name: violationData.policy,
            url: violationData.reviewUrl,
        })
            .context({
            tenantId: violationData.tenantId,
            projectId: violationData.projectId,
        })
            .title(`Policy Violation: ${violationData.policy}`)
            .message(`${violationData.user.name} attempted ${violationData.operation}: ${violationData.reason}`)
            .payload({
            violationId: violationData.id,
            policy: violationData.policy,
            user: violationData.user,
            operation: violationData.operation,
            reason: violationData.reason,
        })
            .source('policy-enforcement')
            .build();
        await this.hub.notify(event);
    }
    async shutdown() {
        this.hub = null;
        this.initialized = false;
    }
    async healthCheck() {
        return this.initialized;
    }
}
exports.AuthorityEventAdapter = AuthorityEventAdapter;
/**
 * Investigation & Evidence Event Adapter
 */
class InvestigationEventAdapter {
    hub = null;
    initialized = false;
    async initialize(hub) {
        this.hub = hub;
        this.initialized = true;
    }
    /**
     * Handle new evidence added
     */
    async handleEvidenceAdded(evidenceData) {
        if (!this.hub)
            throw new Error('Adapter not initialized');
        const event = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.EVIDENCE_ADDED)
            .severity(EventSchema_js_1.EventSeverity.MEDIUM)
            .actor(EventSchema_js_1.EventHelpers.userActor(evidenceData.addedBy.id, evidenceData.addedBy.name))
            .subject({
            type: 'investigation',
            id: evidenceData.investigationId,
            name: evidenceData.investigationName,
            url: evidenceData.investigationUrl,
        })
            .context({
            tenantId: evidenceData.tenantId,
            projectId: evidenceData.projectId,
        })
            .title(`New Evidence: ${evidenceData.investigationName}`)
            .message(`${evidenceData.addedBy.name} added ${evidenceData.evidenceType}: ${evidenceData.summary}`)
            .payload({
            investigationId: evidenceData.investigationId,
            evidenceId: evidenceData.evidenceId,
            evidenceType: evidenceData.evidenceType,
            summary: evidenceData.summary,
        })
            .source('investigation-system')
            .build();
        await this.hub.notify(event);
    }
    async shutdown() {
        this.hub = null;
        this.initialized = false;
    }
    async healthCheck() {
        return this.initialized;
    }
}
exports.InvestigationEventAdapter = InvestigationEventAdapter;
/**
 * Adapter Registry
 * Central registry for all event adapters
 */
class AdapterRegistry {
    adapters = new Map();
    hub = null;
    constructor() {
        // Register all adapters
        this.adapters.set('alerting', new AlertingEventAdapter());
        this.adapters.set('pipeline', new PipelineEventAdapter());
        this.adapters.set('copilot', new CopilotEventAdapter());
        this.adapters.set('authority', new AuthorityEventAdapter());
        this.adapters.set('investigation', new InvestigationEventAdapter());
    }
    async initializeAll(hub) {
        this.hub = hub;
        for (const [name, adapter] of this.adapters) {
            try {
                await adapter.initialize(hub);
                console.log(`Initialized ${name} adapter`);
            }
            catch (error) {
                console.error(`Failed to initialize ${name} adapter:`, error);
            }
        }
    }
    getAdapter(name) {
        return this.adapters.get(name);
    }
    async shutdownAll() {
        for (const adapter of this.adapters.values()) {
            await adapter.shutdown();
        }
    }
    async healthCheckAll() {
        const health = {};
        for (const [name, adapter] of this.adapters) {
            health[name] = await adapter.healthCheck();
        }
        return health;
    }
}
exports.AdapterRegistry = AdapterRegistry;
