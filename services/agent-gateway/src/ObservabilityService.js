"use strict";
/**
 * Observability Service
 * AGENT-7: Observability & Audit
 * Integrates with OpenTelemetry for distributed tracing and metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityService = void 0;
const crypto_1 = require("crypto");
class ObservabilityService {
    metricsEnabled;
    tracingEnabled;
    constructor(metricsEnabled = true, tracingEnabled = true) {
        this.metricsEnabled = metricsEnabled;
        this.tracingEnabled = tracingEnabled;
    }
    /**
     * Start a distributed trace for an agent run
     * AGENT-7a: Structured logging for agent runs
     */
    async startTrace(agent, run) {
        if (!this.tracingEnabled) {
            return {
                traceId: (0, crypto_1.randomUUID)(),
                spanId: (0, crypto_1.randomUUID)(),
            };
        }
        const traceId = (0, crypto_1.randomUUID)();
        const spanId = (0, crypto_1.randomUUID)();
        // Log structured trace start
        this.log('info', 'agent_run_started', {
            traceId,
            spanId,
            agentId: agent.id,
            agentName: agent.name,
            runId: run.id,
            tenantId: run.tenantId,
            operationMode: run.operationMode,
            timestamp: new Date().toISOString(),
        });
        // In a real implementation, this would integrate with OpenTelemetry SDK
        // Example:
        // const tracer = opentelemetry.trace.getTracer('agent-gateway');
        // const span = tracer.startSpan('agent.run', {
        //   attributes: {
        //     'agent.id': agent.id,
        //     'agent.name': agent.name,
        //     'run.id': run.id,
        //     'operation.mode': run.operationMode,
        //   },
        // });
        return { traceId, spanId };
    }
    /**
     * End a trace
     */
    async endTrace(traceId, spanId, result) {
        if (!this.tracingEnabled) {
            return;
        }
        this.log('info', 'agent_run_completed', {
            traceId,
            spanId,
            status: result.status,
            error: result.error,
            timestamp: new Date().toISOString(),
        });
        // In real implementation:
        // span.setStatus({ code: result.status === 'success' ? SpanStatusCode.OK : SpanStatusCode.ERROR });
        // if (result.error) span.recordException(result.error);
        // span.end();
    }
    /**
     * Log an event within a trace
     */
    async logEvent(traceId, spanId, eventType, data) {
        this.log('info', eventType, {
            traceId,
            spanId,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Record a metric
     * AGENT-16a: Define metrics
     */
    async recordMetric(metricName, value, tags) {
        if (!this.metricsEnabled) {
            return;
        }
        this.log('metric', metricName, {
            value,
            tags,
            timestamp: new Date().toISOString(),
        });
        // In real implementation, this would use OpenTelemetry metrics:
        // const meter = opentelemetry.metrics.getMeter('agent-gateway');
        // const counter = meter.createCounter(metricName);
        // counter.add(value, tags);
    }
    /**
     * Record agent action metrics
     */
    async recordActionMetrics(agentId, actionType, status, durationMs) {
        await this.recordMetric('agent.actions.total', 1, {
            agent_id: agentId,
            action_type: actionType,
            status,
        });
        await this.recordMetric('agent.actions.duration', durationMs, {
            agent_id: agentId,
            action_type: actionType,
        });
    }
    /**
     * Record quota usage metrics
     */
    async recordQuotaMetrics(agentId, quotaType, used, limit) {
        await this.recordMetric('agent.quota.used', used, {
            agent_id: agentId,
            quota_type: quotaType,
        });
        const utilizationPercent = (used / limit) * 100;
        await this.recordMetric('agent.quota.utilization', utilizationPercent, {
            agent_id: agentId,
            quota_type: quotaType,
        });
    }
    /**
     * Structured logging
     * AGENT-7a: Structured logging for agent runs
     */
    log(level, message, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: 'agent-gateway',
            ...data,
        };
        // In production, this would use a structured logger like Pino
        // For now, use console
        const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        logMethod(JSON.stringify(logEntry));
    }
    /**
     * Log policy violation
     */
    async logPolicyViolation(agentId, agentName, actionType, reason, traceId) {
        this.log('warn', 'agent_policy_violation', {
            agentId,
            agentName,
            actionType,
            reason,
            traceId,
        });
        await this.recordMetric('agent.policy_violations.total', 1, {
            agent_id: agentId,
            action_type: actionType,
        });
    }
    /**
     * Log quota exceeded
     */
    async logQuotaExceeded(agentId, quotaType, limit, used) {
        this.log('warn', 'agent_quota_exceeded', {
            agentId,
            quotaType,
            limit,
            used,
        });
        await this.recordMetric('agent.quota_exceeded.total', 1, {
            agent_id: agentId,
            quota_type: quotaType,
        });
    }
    /**
     * Log high-risk action attempt
     */
    async logHighRiskAction(agentId, agentName, actionType, riskLevel, requiresApproval, traceId) {
        this.log('warn', 'agent_high_risk_action', {
            agentId,
            agentName,
            actionType,
            riskLevel,
            requiresApproval,
            traceId,
        });
        await this.recordMetric('agent.high_risk_actions.total', 1, {
            agent_id: agentId,
            action_type: actionType,
            risk_level: riskLevel,
        });
    }
    /**
     * Log approval decision
     */
    async logApprovalDecision(approvalId, agentId, decision, decidedBy, traceId) {
        this.log('info', 'agent_approval_decision', {
            approvalId,
            agentId,
            decision,
            decidedBy,
            traceId,
        });
        await this.recordMetric('agent.approvals.decisions.total', 1, {
            agent_id: agentId,
            decision,
        });
    }
}
exports.ObservabilityService = ObservabilityService;
