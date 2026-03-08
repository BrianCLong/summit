"use strict";
/**
 * OpenTelemetry Instrumentation for Governance
 * Provides tracing and metrics for all governance operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceMetrics = void 0;
exports.instrumentAuthorityEvaluation = instrumentAuthorityEvaluation;
exports.instrumentPIIDetection = instrumentPIIDetection;
exports.instrumentProvenanceRecording = instrumentProvenanceRecording;
exports.instrumentCopilotOperation = instrumentCopilotOperation;
exports.createGovernanceContext = createGovernanceContext;
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('@intelgraph/governance-hooks', '1.0.0');
const meter = api_1.metrics.getMeter('@intelgraph/governance-hooks', '1.0.0');
// Metrics
const authorityEvaluations = meter.createCounter('governance_authority_evaluations_total', {
    description: 'Total authority evaluations',
});
const authorityLatency = meter.createHistogram('governance_authority_latency_ms', {
    description: 'Authority evaluation latency in milliseconds',
});
const piiDetections = meter.createCounter('governance_pii_detections_total', {
    description: 'Total PII detections',
});
const provenanceRecords = meter.createCounter('governance_provenance_records_total', {
    description: 'Total provenance records created',
});
const copilotTokens = meter.createCounter('governance_copilot_tokens_total', {
    description: 'Total tokens used by copilot',
});
const citationCoverage = meter.createHistogram('governance_citation_coverage', {
    description: 'Citation coverage percentage',
});
/**
 * Instrument authority evaluation
 */
function instrumentAuthorityEvaluation(operation, fn) {
    return tracer.startActiveSpan(`governance.authority.${operation}`, { kind: api_1.SpanKind.INTERNAL }, async (span) => {
        const start = Date.now();
        try {
            const result = await fn();
            const decision = result.allowed ? 'allowed' : 'denied';
            span.setAttributes({
                'governance.operation': operation,
                'governance.decision': decision,
            });
            authorityEvaluations.add(1, { operation, decision });
            authorityLatency.record(Date.now() - start, { operation });
            return result;
        }
        catch (error) {
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            authorityEvaluations.add(1, { operation, decision: 'error' });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
/**
 * Instrument PII detection
 */
function instrumentPIIDetection(fn) {
    return tracer.startActiveSpan('governance.pii.detect', { kind: api_1.SpanKind.INTERNAL }, async (span) => {
        try {
            const result = await fn();
            const detections = result.detections || [];
            span.setAttributes({
                'governance.pii.count': detections.length,
            });
            detections.forEach((d) => {
                piiDetections.add(1, { type: d.type, action: d.action || 'detected' });
            });
            return result;
        }
        catch (error) {
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
/**
 * Instrument provenance recording
 */
function instrumentProvenanceRecording(activity, fn) {
    return tracer.startActiveSpan(`governance.provenance.${activity}`, { kind: api_1.SpanKind.INTERNAL }, async (span) => {
        try {
            const result = await fn();
            span.setAttributes({
                'governance.provenance.activity': activity,
            });
            provenanceRecords.add(1, { activity });
            return result;
        }
        catch (error) {
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
/**
 * Instrument copilot operations
 */
function instrumentCopilotOperation(operation, model, fn) {
    return tracer.startActiveSpan(`governance.copilot.${operation}`, { kind: api_1.SpanKind.CLIENT }, async (span) => {
        try {
            const result = await fn();
            const response = result;
            span.setAttributes({
                'governance.copilot.operation': operation,
                'governance.copilot.model': model,
                'governance.copilot.tokens': response.tokens || 0,
                'governance.copilot.citation_coverage': response.citationCoverage || 0,
            });
            if (response.tokens) {
                copilotTokens.add(response.tokens, { model, operation });
            }
            if (response.citationCoverage !== undefined) {
                citationCoverage.record(response.citationCoverage, { operation });
            }
            return result;
        }
        catch (error) {
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
/**
 * Create governance context propagator
 */
function createGovernanceContext(attrs) {
    const span = api_1.trace.getActiveSpan();
    if (span) {
        span.setAttributes({
            'governance.user_id': attrs.userId,
            'governance.tenant_id': attrs.tenantId,
            'governance.roles': attrs.roles.join(','),
            'governance.clearance': attrs.clearance || 'UNCLASSIFIED',
        });
    }
    return api_1.context.active();
}
// Export metrics for external access
exports.governanceMetrics = {
    authorityEvaluations,
    authorityLatency,
    piiDetections,
    provenanceRecords,
    copilotTokens,
    citationCoverage,
};
