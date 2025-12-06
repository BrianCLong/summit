/**
 * OpenTelemetry Telemetry Configuration
 *
 * Enterprise-grade observability for the Audit Black Box Service.
 * Provides distributed tracing, metrics, and logging integration.
 *
 * Features:
 * - Auto-instrumentation for HTTP, PostgreSQL, Redis
 * - Custom spans for audit operations
 * - Metrics collection (counters, histograms, gauges)
 * - Baggage propagation for audit context
 * - Export to OTLP, Jaeger, Prometheus
 */

import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  context,
  trace,
  SpanKind,
  SpanStatusCode,
  Span,
  Tracer,
  propagation,
  Baggage,
  baggageEntryMetadataFromString,
} from '@opentelemetry/api';
import {
  metrics,
  Counter,
  Histogram,
  UpDownCounter,
  ObservableGauge,
  Meter,
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import {
  PeriodicExportingMetricReader,
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

/**
 * Telemetry configuration options
 */
export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  otlpEndpoint?: string;
  prometheusPort?: number;
  jaegerEndpoint?: string;
  samplingRatio?: number;
  enableConsoleExport?: boolean;
  enableAutoInstrumentation?: boolean;
  batchSize?: number;
  exportIntervalMs?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TelemetryConfig = {
  serviceName: 'audit-blackbox-service',
  serviceVersion: '1.0.0',
  environment: 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
  samplingRatio: 1.0,
  enableConsoleExport: process.env.NODE_ENV === 'development',
  enableAutoInstrumentation: true,
  batchSize: 512,
  exportIntervalMs: 5000,
};

/**
 * Audit-specific span attributes
 */
export interface AuditSpanAttributes {
  'audit.event_id'?: string;
  'audit.event_type'?: string;
  'audit.actor_id'?: string;
  'audit.actor_type'?: string;
  'audit.resource_type'?: string;
  'audit.resource_id'?: string;
  'audit.action'?: string;
  'audit.outcome'?: string;
  'audit.tenant_id'?: string;
  'audit.session_id'?: string;
  'audit.correlation_id'?: string;
  'audit.chain_sequence'?: number;
  'audit.is_critical'?: boolean;
}

/**
 * Telemetry Manager
 */
export class TelemetryManager {
  private config: TelemetryConfig;
  private sdk: NodeSDK | null = null;
  private tracer: Tracer | null = null;
  private meter: Meter | null = null;

  // Metrics
  private eventIngestCounter: Counter | null = null;
  private eventIngestLatency: Histogram | null = null;
  private chainLengthGauge: ObservableGauge | null = null;
  private verificationCounter: Counter | null = null;
  private verificationLatency: Histogram | null = null;
  private errorCounter: Counter | null = null;
  private activeEventsGauge: UpDownCounter | null = null;
  private redactionCounter: Counter | null = null;
  private searchLatency: Histogram | null = null;
  private exportLatency: Histogram | null = null;
  private backpressureGauge: ObservableGauge | null = null;

  // Observable callbacks
  private chainLengthCallback: (() => number) | null = null;
  private backpressureCallback: (() => number) | null = null;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the telemetry system
   */
  async initialize(): Promise<void> {
    // Set up diagnostic logging
    if (this.config.enableConsoleExport) {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }

    // Create resource
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: this.config.serviceName,
      [ATTR_SERVICE_VERSION]: this.config.serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      'service.namespace': 'audit',
      'service.instance.id': process.env.HOSTNAME || `${this.config.serviceName}-${process.pid}`,
    });

    // Set up exporters
    const traceExporter = new OTLPTraceExporter({
      url: this.config.otlpEndpoint,
    });

    const metricExporter = new OTLPMetricExporter({
      url: this.config.otlpEndpoint,
    });

    // Prometheus exporter for scraping
    const prometheusExporter = new PrometheusExporter({
      port: this.config.prometheusPort,
      startServer: true,
    });

    // Create SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      spanProcessors: [
        this.config.environment === 'development'
          ? new SimpleSpanProcessor(traceExporter)
          : new BatchSpanProcessor(traceExporter, {
              maxQueueSize: this.config.batchSize,
              scheduledDelayMillis: this.config.exportIntervalMs,
            }),
      ],
      instrumentations: this.config.enableAutoInstrumentation
        ? [
            new HttpInstrumentation({
              requestHook: (span, request) => {
                span.setAttribute('http.request.id', request.headers['x-request-id'] as string || '');
              },
            }),
            new ExpressInstrumentation(),
            new PgInstrumentation({
              enhancedDatabaseReporting: true,
            }),
            new RedisInstrumentation(),
          ]
        : [],
    });

    // Start SDK
    await this.sdk.start();

    // Get tracer and meter
    this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    this.meter = metrics.getMeter(this.config.serviceName, this.config.serviceVersion);

    // Initialize metrics
    this.initializeMetrics();

    console.log(`Telemetry initialized for ${this.config.serviceName}`);
  }

  /**
   * Initialize custom metrics
   */
  private initializeMetrics(): void {
    if (!this.meter) return;

    // Event ingestion metrics
    this.eventIngestCounter = this.meter.createCounter('audit_events_ingested_total', {
      description: 'Total number of audit events ingested',
      unit: '1',
    });

    this.eventIngestLatency = this.meter.createHistogram('audit_event_ingest_latency_ms', {
      description: 'Latency of audit event ingestion in milliseconds',
      unit: 'ms',
    });

    // Chain metrics
    this.chainLengthGauge = this.meter.createObservableGauge('audit_chain_length', {
      description: 'Current length of the audit hash chain',
      unit: '1',
    });

    if (this.chainLengthCallback) {
      this.chainLengthGauge.addCallback((result) => {
        result.observe(this.chainLengthCallback?.() || 0, {
          tenant: 'default',
        });
      });
    }

    // Verification metrics
    this.verificationCounter = this.meter.createCounter('audit_verifications_total', {
      description: 'Total number of audit chain verifications',
      unit: '1',
    });

    this.verificationLatency = this.meter.createHistogram('audit_verification_latency_ms', {
      description: 'Latency of audit chain verification in milliseconds',
      unit: 'ms',
    });

    // Error metrics
    this.errorCounter = this.meter.createCounter('audit_errors_total', {
      description: 'Total number of audit service errors',
      unit: '1',
    });

    // Active events gauge
    this.activeEventsGauge = this.meter.createUpDownCounter('audit_events_in_buffer', {
      description: 'Number of events currently in the buffer',
      unit: '1',
    });

    // Redaction metrics
    this.redactionCounter = this.meter.createCounter('audit_redactions_total', {
      description: 'Total number of audit event redactions',
      unit: '1',
    });

    // Search and export latency
    this.searchLatency = this.meter.createHistogram('audit_search_latency_ms', {
      description: 'Latency of audit event searches in milliseconds',
      unit: 'ms',
    });

    this.exportLatency = this.meter.createHistogram('audit_export_latency_ms', {
      description: 'Latency of audit report exports in milliseconds',
      unit: 'ms',
    });

    // Backpressure gauge
    this.backpressureGauge = this.meter.createObservableGauge('audit_backpressure_level', {
      description: 'Current backpressure level (0-1)',
      unit: '1',
    });

    if (this.backpressureCallback) {
      this.backpressureGauge.addCallback((result) => {
        result.observe(this.backpressureCallback?.() || 0);
      });
    }
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer {
    if (!this.tracer) {
      throw new Error('Telemetry not initialized');
    }
    return this.tracer;
  }

  /**
   * Get the meter instance
   */
  getMeter(): Meter {
    if (!this.meter) {
      throw new Error('Telemetry not initialized');
    }
    return this.meter;
  }

  /**
   * Start a new span for an audit operation
   */
  startAuditSpan(
    name: string,
    attributes?: AuditSpanAttributes,
    kind: SpanKind = SpanKind.INTERNAL,
  ): Span {
    const tracer = this.getTracer();

    return tracer.startSpan(name, {
      kind,
      attributes: attributes as Record<string, string | number | boolean>,
    });
  }

  /**
   * Create a span context for audit event tracing
   */
  withAuditContext<T>(
    name: string,
    attributes: AuditSpanAttributes,
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    const span = this.startAuditSpan(name, attributes);

    return context.with(trace.setSpan(context.active(), span), async () => {
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
    });
  }

  /**
   * Record event ingestion
   */
  recordEventIngested(
    eventType: string,
    isCritical: boolean,
    tenantId: string,
    latencyMs: number,
  ): void {
    this.eventIngestCounter?.add(1, {
      event_type: eventType,
      is_critical: isCritical.toString(),
      tenant_id: tenantId,
    });

    this.eventIngestLatency?.record(latencyMs, {
      event_type: eventType,
      is_critical: isCritical.toString(),
    });
  }

  /**
   * Record verification
   */
  recordVerification(
    success: boolean,
    scope: 'full' | 'range' | 'single',
    latencyMs: number,
    eventCount: number,
  ): void {
    this.verificationCounter?.add(1, {
      success: success.toString(),
      scope,
    });

    this.verificationLatency?.record(latencyMs, {
      scope,
      event_count_bucket: this.getBucket(eventCount),
    });
  }

  /**
   * Record error
   */
  recordError(
    errorType: string,
    operation: string,
    tenantId?: string,
  ): void {
    this.errorCounter?.add(1, {
      error_type: errorType,
      operation,
      tenant_id: tenantId || 'unknown',
    });
  }

  /**
   * Record buffer change
   */
  recordBufferChange(delta: number): void {
    this.activeEventsGauge?.add(delta);
  }

  /**
   * Record redaction
   */
  recordRedaction(
    reason: string,
    tenantId: string,
  ): void {
    this.redactionCounter?.add(1, {
      reason,
      tenant_id: tenantId,
    });
  }

  /**
   * Record search operation
   */
  recordSearch(
    latencyMs: number,
    resultCount: number,
    hasFilters: boolean,
  ): void {
    this.searchLatency?.record(latencyMs, {
      result_count_bucket: this.getBucket(resultCount),
      has_filters: hasFilters.toString(),
    });
  }

  /**
   * Record export operation
   */
  recordExport(
    format: string,
    latencyMs: number,
    eventCount: number,
  ): void {
    this.exportLatency?.record(latencyMs, {
      format,
      event_count_bucket: this.getBucket(eventCount),
    });
  }

  /**
   * Set chain length callback
   */
  setChainLengthCallback(callback: () => number): void {
    this.chainLengthCallback = callback;
  }

  /**
   * Set backpressure callback
   */
  setBackpressureCallback(callback: () => number): void {
    this.backpressureCallback = callback;
  }

  /**
   * Create baggage with audit context
   */
  createAuditBaggage(correlationId: string, tenantId: string, sessionId: string): Baggage {
    return propagation.createBaggage({
      'audit.correlation_id': { value: correlationId },
      'audit.tenant_id': { value: tenantId },
      'audit.session_id': { value: sessionId },
    });
  }

  /**
   * Get bucket label for histogram
   */
  private getBucket(value: number): string {
    if (value === 0) return '0';
    if (value <= 10) return '1-10';
    if (value <= 100) return '11-100';
    if (value <= 1000) return '101-1000';
    if (value <= 10000) return '1001-10000';
    return '10000+';
  }

  /**
   * Shutdown telemetry
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      console.log('Telemetry shutdown complete');
    }
  }
}

/**
 * Global telemetry instance
 */
let globalTelemetry: TelemetryManager | null = null;

/**
 * Initialize global telemetry
 */
export async function initializeTelemetry(
  config: Partial<TelemetryConfig> = {},
): Promise<TelemetryManager> {
  if (!globalTelemetry) {
    globalTelemetry = new TelemetryManager(config);
    await globalTelemetry.initialize();
  }
  return globalTelemetry;
}

/**
 * Get global telemetry instance
 */
export function getTelemetry(): TelemetryManager {
  if (!globalTelemetry) {
    throw new Error('Telemetry not initialized. Call initializeTelemetry first.');
  }
  return globalTelemetry;
}

/**
 * Shutdown global telemetry
 */
export async function shutdownTelemetry(): Promise<void> {
  if (globalTelemetry) {
    await globalTelemetry.shutdown();
    globalTelemetry = null;
  }
}
