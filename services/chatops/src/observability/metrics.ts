/**
 * ChatOps Observability & Metrics Layer
 *
 * Provides comprehensive observability for the ChatOps service:
 * - OpenTelemetry integration (traces, metrics, logs)
 * - Custom business metrics
 * - SLI/SLO tracking
 * - Alert integration
 * - Health checks
 *
 * Metrics categories:
 * - Session metrics (active, created, expired)
 * - Message processing (latency, throughput)
 * - Model usage (tokens, cost estimation)
 * - Risk classification distribution
 * - Approval workflow timings
 * - Guardrail triggering rates
 */

import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  Tracer,
  Span,
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// =============================================================================
// TYPES
// =============================================================================

export interface MetricsConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  prometheusPort?: number;
  otlpEndpoint?: string;
  enableTracing?: boolean;
  enableMetrics?: boolean;
  sampleRate?: number;
}

export interface SessionMetrics {
  active: number;
  created: number;
  expired: number;
  byPlatform: Record<string, number>;
  byTenant: Record<string, number>;
}

export interface MessageMetrics {
  totalProcessed: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  byIntent: Record<string, number>;
}

export interface ModelMetrics {
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    latencyMs: number;
  }>;
}

export interface RiskMetrics {
  byLevel: Record<string, number>;
  approvalsPending: number;
  approvalsGranted: number;
  approvalsDenied: number;
  avgApprovalTimeMs: number;
}

export interface GuardrailMetrics {
  totalChecks: number;
  blockedAttempts: number;
  byCategory: Record<string, number>;
  falsePositiveRate: number;
}

export interface SLOStatus {
  name: string;
  target: number;
  current: number;
  status: 'healthy' | 'warning' | 'critical';
  windowHours: number;
}

// =============================================================================
// OBSERVABILITY SERVICE
// =============================================================================

export class ObservabilityService {
  private config: MetricsConfig;
  private tracer: Tracer;
  private meterProvider?: MeterProvider;
  private tracerProvider?: NodeTracerProvider;

  // Metric instruments
  private sessionGauge: any;
  private messageCounter: any;
  private messageLatencyHistogram: any;
  private tokenCounter: any;
  private riskCounter: any;
  private approvalGauge: any;
  private guardrailCounter: any;
  private errorCounter: any;

  // In-memory aggregations for SLO calculations
  private latencies: number[] = [];
  private errorCount = 0;
  private totalRequests = 0;

  constructor(config: MetricsConfig) {
    this.config = {
      prometheusPort: 9464,
      enableTracing: true,
      enableMetrics: true,
      sampleRate: 1.0,
      ...config,
    };

    this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
    this.setupInstrumentation();
  }

  // ===========================================================================
  // SETUP
  // ===========================================================================

  private setupInstrumentation(): void {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
    });

    // Setup tracing
    if (this.config.enableTracing) {
      this.tracerProvider = new NodeTracerProvider({ resource });

      if (this.config.otlpEndpoint) {
        const exporter = new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
        });
        this.tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
      }

      this.tracerProvider.register();
    }

    // Setup metrics
    if (this.config.enableMetrics) {
      const prometheusExporter = new PrometheusExporter({
        port: this.config.prometheusPort,
      });

      this.meterProvider = new MeterProvider({
        resource,
        readers: [
          new PeriodicExportingMetricReader({
            exporter: prometheusExporter,
            exportIntervalMillis: 15000,
          }),
        ],
      });

      this.setupMetricInstruments();
    }
  }

  private setupMetricInstruments(): void {
    if (!this.meterProvider) return;

    const meter = this.meterProvider.getMeter(this.config.serviceName);

    // Session metrics
    this.sessionGauge = meter.createObservableGauge('chatops_sessions', {
      description: 'Number of active ChatOps sessions',
    });

    // Message processing metrics
    this.messageCounter = meter.createCounter('chatops_messages_total', {
      description: 'Total messages processed',
    });

    this.messageLatencyHistogram = meter.createHistogram('chatops_message_latency_ms', {
      description: 'Message processing latency in milliseconds',
      boundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    });

    // Token usage metrics
    this.tokenCounter = meter.createCounter('chatops_tokens_total', {
      description: 'Total tokens used',
    });

    // Risk classification metrics
    this.riskCounter = meter.createCounter('chatops_risk_classifications_total', {
      description: 'Risk classifications by level',
    });

    // Approval metrics
    this.approvalGauge = meter.createObservableGauge('chatops_approvals_pending', {
      description: 'Number of pending approvals',
    });

    // Guardrail metrics
    this.guardrailCounter = meter.createCounter('chatops_guardrail_triggers_total', {
      description: 'Guardrail trigger events',
    });

    // Error metrics
    this.errorCounter = meter.createCounter('chatops_errors_total', {
      description: 'Total errors by type',
    });
  }

  // ===========================================================================
  // TRACING
  // ===========================================================================

  /**
   * Start a new span for an operation
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
      parentSpan?: Span;
    }
  ): Span {
    const spanOptions = {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
    };

    if (options?.parentSpan) {
      const ctx = trace.setSpan(context.active(), options.parentSpan);
      return this.tracer.startSpan(name, spanOptions, ctx);
    }

    return this.tracer.startSpan(name, spanOptions);
  }

  /**
   * Wrap an async function with a span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add an event to the current span
   */
  addSpanEvent(span: Span, name: string, attributes?: Record<string, string | number>): void {
    span.addEvent(name, attributes);
  }

  // ===========================================================================
  // METRICS RECORDING
  // ===========================================================================

  /**
   * Record a message processed
   */
  recordMessage(attributes: {
    platform: string;
    intent?: string;
    success: boolean;
    latencyMs: number;
  }): void {
    this.messageCounter?.add(1, {
      platform: attributes.platform,
      intent: attributes.intent || 'unknown',
      success: String(attributes.success),
    });

    this.messageLatencyHistogram?.record(attributes.latencyMs, {
      platform: attributes.platform,
    });

    // Track for SLO calculations
    this.latencies.push(attributes.latencyMs);
    this.totalRequests++;
    if (!attributes.success) this.errorCount++;

    // Keep rolling window of last 10000 requests
    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-10000);
    }
  }

  /**
   * Record token usage
   */
  recordTokens(attributes: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    operation: string;
  }): void {
    const totalTokens = attributes.inputTokens + attributes.outputTokens;

    this.tokenCounter?.add(totalTokens, {
      model: attributes.model,
      type: 'total',
      operation: attributes.operation,
    });

    this.tokenCounter?.add(attributes.inputTokens, {
      model: attributes.model,
      type: 'input',
      operation: attributes.operation,
    });

    this.tokenCounter?.add(attributes.outputTokens, {
      model: attributes.model,
      type: 'output',
      operation: attributes.operation,
    });
  }

  /**
   * Record risk classification
   */
  recordRiskClassification(attributes: {
    level: 'autonomous' | 'hitl' | 'prohibited';
    toolId: string;
    operation: string;
  }): void {
    this.riskCounter?.add(1, {
      level: attributes.level,
      tool_id: attributes.toolId,
      operation: attributes.operation,
    });
  }

  /**
   * Record guardrail trigger
   */
  recordGuardrailTrigger(attributes: {
    category: string;
    action: 'blocked' | 'warned' | 'logged';
    confidence: number;
  }): void {
    this.guardrailCounter?.add(1, {
      category: attributes.category,
      action: attributes.action,
    });
  }

  /**
   * Record an error
   */
  recordError(attributes: {
    type: string;
    code?: string;
    component: string;
  }): void {
    this.errorCounter?.add(1, {
      type: attributes.type,
      code: attributes.code || 'unknown',
      component: attributes.component,
    });
  }

  // ===========================================================================
  // SLO TRACKING
  // ===========================================================================

  /**
   * Get current SLO status
   */
  getSLOStatus(): SLOStatus[] {
    const slos: SLOStatus[] = [];

    // Availability SLO (99.9%)
    const errorRate = this.totalRequests > 0
      ? this.errorCount / this.totalRequests
      : 0;
    const availability = 1 - errorRate;

    slos.push({
      name: 'Availability',
      target: 0.999,
      current: availability,
      status: availability >= 0.999 ? 'healthy' : availability >= 0.995 ? 'warning' : 'critical',
      windowHours: 24,
    });

    // Latency SLO (P95 < 500ms)
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index];

      slos.push({
        name: 'Latency P95',
        target: 500,
        current: p95,
        status: p95 <= 500 ? 'healthy' : p95 <= 1000 ? 'warning' : 'critical',
        windowHours: 1,
      });

      // P99 < 2000ms
      const p99Index = Math.floor(sorted.length * 0.99);
      const p99 = sorted[p99Index];

      slos.push({
        name: 'Latency P99',
        target: 2000,
        current: p99,
        status: p99 <= 2000 ? 'healthy' : p99 <= 5000 ? 'warning' : 'critical',
        windowHours: 1,
      });
    }

    return slos;
  }

  // ===========================================================================
  // HEALTH CHECKS
  // ===========================================================================

  /**
   * Comprehensive health check
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      latencyMs?: number;
      message?: string;
    }>;
    slos: SLOStatus[];
  }> {
    const checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      latencyMs?: number;
      message?: string;
    }> = [];

    // Service check
    checks.push({
      name: 'service',
      status: 'pass',
      message: 'Service is running',
    });

    // SLO checks
    const slos = this.getSLOStatus();
    for (const slo of slos) {
      checks.push({
        name: `slo_${slo.name.toLowerCase().replace(/\s+/g, '_')}`,
        status: slo.status === 'healthy' ? 'pass' : slo.status === 'warning' ? 'warn' : 'fail',
        message: `${slo.name}: ${slo.current.toFixed(3)} (target: ${slo.target})`,
      });
    }

    // Determine overall status
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (failCount > 0) status = 'unhealthy';
    else if (warnCount > 0) status = 'degraded';

    return { status, checks, slos };
  }

  // ===========================================================================
  // DASHBOARDS DATA
  // ===========================================================================

  /**
   * Get aggregated metrics for dashboard
   */
  getAggregatedMetrics(): {
    sessions: SessionMetrics;
    messages: MessageMetrics;
    model: ModelMetrics;
    risk: RiskMetrics;
    guardrails: GuardrailMetrics;
  } {
    // In production, these would query Prometheus/metric stores
    // Here we provide the structure
    return {
      sessions: {
        active: 0,
        created: 0,
        expired: 0,
        byPlatform: {},
        byTenant: {},
      },
      messages: {
        totalProcessed: this.totalRequests,
        avgLatencyMs: this.latencies.length > 0
          ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
          : 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        errorRate: this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0,
        byIntent: {},
      },
      model: {
        totalRequests: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        avgLatencyMs: 0,
        byModel: {},
      },
      risk: {
        byLevel: {},
        approvalsPending: 0,
        approvalsGranted: 0,
        approvalsDenied: 0,
        avgApprovalTimeMs: 0,
      },
      guardrails: {
        totalChecks: 0,
        blockedAttempts: 0,
        byCategory: {},
        falsePositiveRate: 0,
      },
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async shutdown(): Promise<void> {
    if (this.tracerProvider) {
      await this.tracerProvider.shutdown();
    }
    if (this.meterProvider) {
      await this.meterProvider.shutdown();
    }
  }
}

// =============================================================================
// DECORATORS
// =============================================================================

/**
 * Decorator for automatic span creation
 */
export function Traced(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const observability = (this as any).observability as ObservabilityService;
      if (!observability) {
        return originalMethod.apply(this, args);
      }

      return observability.withSpan(name, async (span) => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

/**
 * Decorator for automatic metric recording
 */
export function Metered(metricName: string, attributes?: Record<string, string>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const observability = (this as any).observability as ObservabilityService;
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);

        if (observability) {
          observability.recordMessage({
            platform: attributes?.platform || 'unknown',
            intent: attributes?.intent,
            success: true,
            latencyMs: Date.now() - startTime,
          });
        }

        return result;
      } catch (error) {
        if (observability) {
          observability.recordMessage({
            platform: attributes?.platform || 'unknown',
            intent: attributes?.intent,
            success: false,
            latencyMs: Date.now() - startTime,
          });
          observability.recordError({
            type: error instanceof Error ? error.constructor.name : 'UnknownError',
            component: metricName,
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}

// =============================================================================
// FACTORY
// =============================================================================

export function createObservabilityService(config: MetricsConfig): ObservabilityService {
  return new ObservabilityService(config);
}
