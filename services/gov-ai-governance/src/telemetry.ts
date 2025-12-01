/**
 * OpenTelemetry Instrumentation
 *
 * Provides distributed tracing and metrics for observability.
 */

import { trace, SpanStatusCode, Span, context } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';

// Tracer for distributed tracing
export const tracer = trace.getTracer('gov-ai-governance', '1.0.0');

// Metrics
const meter = metrics.getMeter('gov-ai-governance', '1.0.0');

export const governanceMetrics = {
  consentsGranted: meter.createCounter('gov_ai_consents_granted', {
    description: 'Number of consent grants recorded',
  }),
  consentsWithdrawn: meter.createCounter('gov_ai_consents_withdrawn', {
    description: 'Number of consent withdrawals',
  }),
  dataRequests: meter.createCounter('gov_ai_data_requests', {
    description: 'Number of data access requests',
  }),
  modelsRegistered: meter.createCounter('gov_ai_models_registered', {
    description: 'Number of AI models registered',
  }),
  modelsDeployed: meter.createCounter('gov_ai_models_deployed', {
    description: 'Number of AI models deployed',
  }),
  deploymentBlocked: meter.createCounter('gov_ai_deployment_blocked', {
    description: 'Number of deployment attempts blocked by governance',
  }),
  decisionsRecorded: meter.createCounter('gov_ai_decisions_recorded', {
    description: 'Number of AI decisions recorded',
  }),
  appealsReceived: meter.createCounter('gov_ai_appeals_received', {
    description: 'Number of appeals filed',
  }),
  humanReviewTriggered: meter.createCounter('gov_ai_human_review_triggered', {
    description: 'Number of times human review was required',
  }),
  auditChainLength: meter.createObservableGauge('gov_ai_audit_chain_length', {
    description: 'Current length of the audit chain',
  }),
  cacheHitRate: meter.createObservableGauge('gov_ai_cache_hit_rate', {
    description: 'Cache hit rate percentage',
  }),
  complianceScore: meter.createHistogram('gov_ai_compliance_score', {
    description: 'Distribution of compliance assessment scores',
  }),
  decisionConfidence: meter.createHistogram('gov_ai_decision_confidence', {
    description: 'Distribution of AI decision confidence scores',
  }),
  requestLatency: meter.createHistogram('gov_ai_request_latency_ms', {
    description: 'Request latency in milliseconds',
  }),
};

/**
 * Decorator for tracing async functions
 */
export function withSpan<T extends (...args: unknown[]) => Promise<unknown>>(
  spanName: string,
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    return tracer.startActiveSpan(spanName, async (span: Span) => {
      try {
        const result = await fn(...args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }) as T;
}

/**
 * Express middleware for request tracing
 */
export function tracingMiddleware() {
  return (req: { method: string; path: string }, res: { statusCode: number; on: (event: string, cb: () => void) => void }, next: () => void) => {
    const startTime = Date.now();

    tracer.startActiveSpan(`HTTP ${req.method} ${req.path}`, (span) => {
      span.setAttribute('http.method', req.method);
      span.setAttribute('http.url', req.path);

      res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode);
        span.setStatus({
          code: res.statusCode < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.end();

        // Record latency metric
        governanceMetrics.requestLatency.record(Date.now() - startTime, {
          method: req.method,
          path: req.path,
          status: String(res.statusCode),
        });
      });

      next();
    });
  };
}
