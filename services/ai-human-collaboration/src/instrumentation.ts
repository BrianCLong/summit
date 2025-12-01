/**
 * OpenTelemetry Instrumentation for AI-Human Collaboration Service
 * Provides tracing, metrics, and logging integration
 */

/**
 * Span attributes for collaboration operations
 */
export interface CollaborationSpanAttributes {
  'collaboration.mission_id'?: string;
  'collaboration.session_id'?: string;
  'collaboration.recommendation_id'?: string;
  'collaboration.decision_id'?: string;
  'collaboration.feedback_id'?: string;
  'collaboration.autonomy_level'?: string;
  'collaboration.confidence'?: number;
  'collaboration.confidence_band'?: string;
  'collaboration.risk_level'?: string;
  'collaboration.outcome'?: string;
  'collaboration.commander_id'?: string;
  'collaboration.operator_id'?: string;
  'collaboration.action'?: string;
  'collaboration.action_type'?: string;
  'collaboration.requires_approval'?: boolean;
  'collaboration.auto_approved'?: boolean;
  'collaboration.execution_success'?: boolean;
  'collaboration.execution_duration_ms'?: number;
}

/**
 * Metric names for collaboration service
 */
export const METRICS = {
  // Counters
  RECOMMENDATIONS_GENERATED: 'collaboration.recommendations.generated',
  RECOMMENDATIONS_AUTO_APPROVED: 'collaboration.recommendations.auto_approved',
  RECOMMENDATIONS_EXPIRED: 'collaboration.recommendations.expired',
  DECISIONS_MADE: 'collaboration.decisions.made',
  DECISIONS_ACCEPTED: 'collaboration.decisions.accepted',
  DECISIONS_REJECTED: 'collaboration.decisions.rejected',
  DECISIONS_MODIFIED: 'collaboration.decisions.modified',
  FEEDBACK_SUBMITTED: 'collaboration.feedback.submitted',
  FEEDBACK_POSITIVE: 'collaboration.feedback.positive',
  FEEDBACK_NEGATIVE: 'collaboration.feedback.negative',
  FEEDBACK_CORRECTIVE: 'collaboration.feedback.corrective',
  RETRAINING_TRIGGERED: 'collaboration.retraining.triggered',
  AUDIT_ENTRIES_CREATED: 'collaboration.audit.entries_created',
  INTEGRITY_VIOLATIONS: 'collaboration.audit.integrity_violations',

  // Histograms
  RECOMMENDATION_CONFIDENCE: 'collaboration.recommendation.confidence',
  RECOMMENDATION_LATENCY: 'collaboration.recommendation.latency_ms',
  DECISION_LATENCY: 'collaboration.decision.latency_ms',
  EXECUTION_LATENCY: 'collaboration.execution.latency_ms',
  FEEDBACK_RATING: 'collaboration.feedback.rating',

  // Gauges
  ACTIVE_SESSIONS: 'collaboration.sessions.active',
  PENDING_APPROVALS: 'collaboration.approvals.pending',
  UNPROCESSED_FEEDBACK: 'collaboration.feedback.unprocessed',
} as const;

/**
 * Span names for collaboration operations
 */
export const SPANS = {
  GENERATE_RECOMMENDATION: 'collaboration.generate_recommendation',
  PROCESS_DECISION: 'collaboration.process_decision',
  EXECUTE_ACTION: 'collaboration.execute_action',
  SUBMIT_FEEDBACK: 'collaboration.submit_feedback',
  CREATE_TRAINING_BATCH: 'collaboration.create_training_batch',
  PROCESS_TRAINING_BATCH: 'collaboration.process_training_batch',
  RECORD_AUDIT: 'collaboration.record_audit',
  VERIFY_INTEGRITY: 'collaboration.verify_integrity',
  START_SESSION: 'collaboration.start_session',
  END_SESSION: 'collaboration.end_session',
} as const;

/**
 * Tracer interface (compatible with OpenTelemetry)
 */
export interface Tracer {
  startSpan(name: string, attributes?: Record<string, unknown>): Span;
}

/**
 * Span interface (compatible with OpenTelemetry)
 */
export interface Span {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attributes: Record<string, string | number | boolean>): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  recordException(error: Error): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

/**
 * Meter interface (compatible with OpenTelemetry)
 */
export interface Meter {
  createCounter(name: string, options?: { description?: string }): Counter;
  createHistogram(name: string, options?: { description?: string }): Histogram;
  createUpDownCounter(name: string, options?: { description?: string }): UpDownCounter;
}

export interface Counter {
  add(value: number, attributes?: Record<string, string>): void;
}

export interface Histogram {
  record(value: number, attributes?: Record<string, string>): void;
}

export interface UpDownCounter {
  add(value: number, attributes?: Record<string, string>): void;
}

/**
 * No-op implementations for when OTel is not configured
 */
class NoOpSpan implements Span {
  setAttribute(): void {}
  setAttributes(): void {}
  addEvent(): void {}
  recordException(): void {}
  setStatus(): void {}
  end(): void {}
}

class NoOpCounter implements Counter {
  add(): void {}
}

class NoOpHistogram implements Histogram {
  record(): void {}
}

class NoOpUpDownCounter implements UpDownCounter {
  add(): void {}
}

class NoOpTracer implements Tracer {
  startSpan(): Span {
    return new NoOpSpan();
  }
}

class NoOpMeter implements Meter {
  createCounter(): Counter {
    return new NoOpCounter();
  }
  createHistogram(): Histogram {
    return new NoOpHistogram();
  }
  createUpDownCounter(): UpDownCounter {
    return new NoOpUpDownCounter();
  }
}

/**
 * Instrumentation configuration
 */
export interface InstrumentationConfig {
  tracer?: Tracer;
  meter?: Meter;
  serviceName?: string;
  serviceVersion?: string;
}

/**
 * Collaboration service instrumentation
 */
export class CollaborationInstrumentation {
  private tracer: Tracer;
  private meter: Meter;
  private serviceName: string;
  private serviceVersion: string;

  // Counters
  private recommendationsCounter: Counter;
  private autoApprovedCounter: Counter;
  private decisionsCounter: Counter;
  private feedbackCounter: Counter;
  private auditCounter: Counter;

  // Histograms
  private confidenceHistogram: Histogram;
  private recommendationLatency: Histogram;
  private decisionLatency: Histogram;
  private executionLatency: Histogram;
  private ratingHistogram: Histogram;

  // Gauges
  private activeSessionsGauge: UpDownCounter;
  private pendingApprovalsGauge: UpDownCounter;

  constructor(config: InstrumentationConfig = {}) {
    this.tracer = config.tracer || new NoOpTracer();
    this.meter = config.meter || new NoOpMeter();
    this.serviceName = config.serviceName || 'ai-human-collaboration';
    this.serviceVersion = config.serviceVersion || '1.0.0';

    // Initialize metrics
    this.recommendationsCounter = this.meter.createCounter(
      METRICS.RECOMMENDATIONS_GENERATED,
      { description: 'Number of recommendations generated' }
    );
    this.autoApprovedCounter = this.meter.createCounter(
      METRICS.RECOMMENDATIONS_AUTO_APPROVED,
      { description: 'Number of auto-approved recommendations' }
    );
    this.decisionsCounter = this.meter.createCounter(
      METRICS.DECISIONS_MADE,
      { description: 'Number of decisions made' }
    );
    this.feedbackCounter = this.meter.createCounter(
      METRICS.FEEDBACK_SUBMITTED,
      { description: 'Number of feedback submissions' }
    );
    this.auditCounter = this.meter.createCounter(
      METRICS.AUDIT_ENTRIES_CREATED,
      { description: 'Number of audit entries created' }
    );

    this.confidenceHistogram = this.meter.createHistogram(
      METRICS.RECOMMENDATION_CONFIDENCE,
      { description: 'Distribution of recommendation confidence scores' }
    );
    this.recommendationLatency = this.meter.createHistogram(
      METRICS.RECOMMENDATION_LATENCY,
      { description: 'Latency of recommendation generation' }
    );
    this.decisionLatency = this.meter.createHistogram(
      METRICS.DECISION_LATENCY,
      { description: 'Latency of decision processing' }
    );
    this.executionLatency = this.meter.createHistogram(
      METRICS.EXECUTION_LATENCY,
      { description: 'Latency of action execution' }
    );
    this.ratingHistogram = this.meter.createHistogram(
      METRICS.FEEDBACK_RATING,
      { description: 'Distribution of feedback ratings' }
    );

    this.activeSessionsGauge = this.meter.createUpDownCounter(
      METRICS.ACTIVE_SESSIONS,
      { description: 'Number of active collaboration sessions' }
    );
    this.pendingApprovalsGauge = this.meter.createUpDownCounter(
      METRICS.PENDING_APPROVALS,
      { description: 'Number of pending approvals' }
    );
  }

  /**
   * Start a traced operation
   */
  startSpan(name: string, attributes?: CollaborationSpanAttributes): Span {
    return this.tracer.startSpan(name, attributes);
  }

  /**
   * Record recommendation generated
   */
  recordRecommendation(
    confidence: number,
    riskLevel: string,
    autoApproved: boolean,
    latencyMs: number
  ): void {
    this.recommendationsCounter.add(1, { risk_level: riskLevel });
    this.confidenceHistogram.record(confidence);
    this.recommendationLatency.record(latencyMs);

    if (autoApproved) {
      this.autoApprovedCounter.add(1);
    } else {
      this.pendingApprovalsGauge.add(1);
    }
  }

  /**
   * Record decision made
   */
  recordDecision(outcome: string, latencyMs: number): void {
    this.decisionsCounter.add(1, { outcome });
    this.decisionLatency.record(latencyMs);
    this.pendingApprovalsGauge.add(-1);
  }

  /**
   * Record execution
   */
  recordExecution(success: boolean, latencyMs: number): void {
    this.executionLatency.record(latencyMs, { success: String(success) });
  }

  /**
   * Record feedback
   */
  recordFeedback(sentiment: string, rating: number): void {
    this.feedbackCounter.add(1, { sentiment });
    this.ratingHistogram.record(rating);
  }

  /**
   * Record session start
   */
  recordSessionStart(): void {
    this.activeSessionsGauge.add(1);
  }

  /**
   * Record session end
   */
  recordSessionEnd(): void {
    this.activeSessionsGauge.add(-1);
  }

  /**
   * Record audit entry
   */
  recordAuditEntry(eventType: string): void {
    this.auditCounter.add(1, { event_type: eventType });
  }

  /**
   * Wrap async function with tracing
   */
  async trace<T>(
    spanName: string,
    attributes: CollaborationSpanAttributes,
    fn: () => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(spanName, attributes);
    const startTime = Date.now();

    try {
      const result = await fn();
      span.setStatus({ code: 0 });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.setAttribute('duration_ms', Date.now() - startTime);
      span.end();
    }
  }
}

/**
 * Default instrumentation instance
 */
let defaultInstrumentation: CollaborationInstrumentation | null = null;

export function getInstrumentation(): CollaborationInstrumentation {
  if (!defaultInstrumentation) {
    defaultInstrumentation = new CollaborationInstrumentation();
  }
  return defaultInstrumentation;
}

export function configureInstrumentation(config: InstrumentationConfig): void {
  defaultInstrumentation = new CollaborationInstrumentation(config);
}
