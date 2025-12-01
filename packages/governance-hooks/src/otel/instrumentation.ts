/**
 * OpenTelemetry Instrumentation for Governance
 * Provides tracing and metrics for all governance operations
 */

import { Span, SpanKind, SpanStatusCode, trace, metrics, context } from '@opentelemetry/api';

const tracer = trace.getTracer('@summit/governance-hooks', '1.0.0');
const meter = metrics.getMeter('@summit/governance-hooks', '1.0.0');

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
export function instrumentAuthorityEvaluation<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    `governance.authority.${operation}`,
    { kind: SpanKind.INTERNAL },
    async (span: Span) => {
      const start = Date.now();
      try {
        const result = await fn();
        const decision = (result as any).allowed ? 'allowed' : 'denied';

        span.setAttributes({
          'governance.operation': operation,
          'governance.decision': decision,
        });

        authorityEvaluations.add(1, { operation, decision });
        authorityLatency.record(Date.now() - start, { operation });

        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        authorityEvaluations.add(1, { operation, decision: 'error' });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Instrument PII detection
 */
export function instrumentPIIDetection<T>(
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    'governance.pii.detect',
    { kind: SpanKind.INTERNAL },
    async (span: Span) => {
      try {
        const result = await fn();
        const detections = (result as any).detections || [];

        span.setAttributes({
          'governance.pii.count': detections.length,
        });

        detections.forEach((d: any) => {
          piiDetections.add(1, { type: d.type, action: d.action || 'detected' });
        });

        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Instrument provenance recording
 */
export function instrumentProvenanceRecording<T>(
  activity: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    `governance.provenance.${activity}`,
    { kind: SpanKind.INTERNAL },
    async (span: Span) => {
      try {
        const result = await fn();

        span.setAttributes({
          'governance.provenance.activity': activity,
        });

        provenanceRecords.add(1, { activity });

        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Instrument copilot operations
 */
export function instrumentCopilotOperation<T>(
  operation: string,
  model: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    `governance.copilot.${operation}`,
    { kind: SpanKind.CLIENT },
    async (span: Span) => {
      try {
        const result = await fn();
        const response = result as any;

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
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Create governance context propagator
 */
export function createGovernanceContext(attrs: {
  userId: string;
  tenantId: string;
  roles: string[];
  clearance?: string;
}) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes({
      'governance.user_id': attrs.userId,
      'governance.tenant_id': attrs.tenantId,
      'governance.roles': attrs.roles.join(','),
      'governance.clearance': attrs.clearance || 'UNCLASSIFIED',
    });
  }
  return context.active();
}

// Export metrics for external access
export const governanceMetrics = {
  authorityEvaluations,
  authorityLatency,
  piiDetections,
  provenanceRecords,
  copilotTokens,
  citationCoverage,
};
