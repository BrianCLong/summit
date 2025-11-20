/**
 * Maestro Observability - Distributed Tracing and Metrics
 * Provides end-to-end visibility across workflow execution
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
  trace,
  context,
  propagation,
  metrics,
  SpanStatusCode,
  SpanKind,
} from '@opentelemetry/api';
import { Counter, Histogram } from '@opentelemetry/api-metrics';
import { EventEmitter } from 'events';

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  prometheusPort?: number;
  enableAutoInstrumentation?: boolean;
  sampleRate?: number;
}

export interface SpanOptions {
  operationName: string;
  parentSpan?: any;
  tags?: Record<string, any>;
  kind?: SpanKind;
}

export class MaestroTracer extends EventEmitter {
  private sdk: NodeSDK;
  private tracer: any;
  private meter: any;

  // Metrics
  private workflowRunsTotal: Counter;
  private workflowDuration: Histogram;
  private stepExecutionsTotal: Counter;
  private stepDuration: Histogram;
  private activeRunsValue = 0;
  private costTotal: Counter;
  private errorRate: Counter;

  constructor(private config: TracingConfig) {
    super();

    this.initializeSDK();
    this.initializeTracer();
    this.initializeMetrics();
  }

  private initializeSDK(): void {
    // Create resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        this.config.environment,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'maestro',
    });

    // Configure exporters
    const exporters: any[] = [];

    if (this.config.jaegerEndpoint) {
      exporters.push(
        new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
        }),
      );
    }

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter: exporters.length > 0 ? exporters[0] : undefined,
      metricExporter: new PrometheusExporter({
        port: this.config.prometheusPort || 9090,
      }),
      instrumentations:
        this.config.enableAutoInstrumentation !== false
          ? [getNodeAutoInstrumentations()]
          : [],
    });
  }

  private initializeTracer(): void {
    this.tracer = trace.getTracer(
      this.config.serviceName,
      this.config.serviceVersion,
    );
  }

  private initializeMetrics(): void {
    this.meter = metrics.getMeter(
      this.config.serviceName,
      this.config.serviceVersion,
    );

    // Workflow metrics
    this.workflowRunsTotal = this.meter.createCounter(
      'maestro_workflow_runs_total',
      {
        description: 'Total number of workflow runs',
      },
    );

    this.workflowDuration = this.meter.createHistogram(
      'maestro_workflow_duration_seconds',
      {
        description: 'Workflow execution duration in seconds',
        unit: 's',
      },
    );

    // Step metrics
    this.stepExecutionsTotal = this.meter.createCounter(
      'maestro_step_executions_total',
      {
        description: 'Total number of step executions',
      },
    );

    this.stepDuration = this.meter.createHistogram(
      'maestro_step_duration_seconds',
      {
        description: 'Step execution duration in seconds',
        unit: 's',
      },
    );

    // System metrics
    this.meter.createObservableGauge(
      'maestro_active_runs',
      {
        description: 'Number of currently active workflow runs',
      },
      (observableResult) => {
        observableResult.observe(this.activeRunsValue);
      },
    );

    this.costTotal = this.meter.createCounter('maestro_cost_usd_total', {
      description: 'Total cost in USD',
      unit: 'USD',
    });

    this.errorRate = this.meter.createCounter('maestro_errors_total', {
      description: 'Total number of errors',
    });
  }

  async start(): Promise<void> {
    await this.sdk.start();
    console.log('Maestro tracing initialized');
  }

  async shutdown(): Promise<void> {
    await this.sdk.shutdown();
  }

  // Workflow tracing
  startWorkflowSpan(
    runId: string,
    workflowName: string,
    attributes: Record<string, any> = {},
  ): any {
    const span = this.tracer.startSpan(`workflow:${workflowName}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'maestro.run_id': runId,
        'maestro.workflow.name': workflowName,
        'maestro.workflow.version': attributes.version || '1.0.0',
        'maestro.tenant_id': attributes.tenant_id,
        'maestro.environment': attributes.environment,
        ...attributes,
      },
    });

    // Record workflow start
    this.workflowRunsTotal.add(1, {
      workflow_name: workflowName,
      environment: attributes.environment || 'unknown',
      tenant_id: attributes.tenant_id || 'unknown',
    });

    return span;
  }

  finishWorkflowSpan(
    span: any,
    status: 'completed' | 'failed' | 'cancelled',
    duration: number,
    metadata: Record<string, any> = {},
  ): void {
    // Set span status
    if (status === 'completed') {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: metadata.error || `Workflow ${status}`,
      });
    }

    // Add metadata
    span.setAttributes({
      'maestro.workflow.status': status,
      'maestro.workflow.duration_ms': duration,
      'maestro.workflow.total_steps': metadata.total_steps || 0,
      'maestro.workflow.completed_steps': metadata.completed_steps || 0,
      'maestro.workflow.failed_steps': metadata.failed_steps || 0,
      'maestro.workflow.total_cost_usd': metadata.total_cost || 0,
    });

    span.end();

    // Record metrics
    this.workflowDuration.record(duration / 1000, {
      workflow_name: span.getAttribute('maestro.workflow.name'),
      status,
      environment: span.getAttribute('maestro.environment'),
    });

    if (metadata.total_cost) {
      this.costTotal.add(metadata.total_cost, {
        workflow_name: span.getAttribute('maestro.workflow.name'),
        tenant_id: span.getAttribute('maestro.tenant_id'),
      });
    }

    if (status !== 'completed') {
      this.errorRate.add(1, {
        error_type: status,
        workflow_name: span.getAttribute('maestro.workflow.name'),
      });
    }
  }

  // Step tracing
  startStepSpan(
    parentSpan: any,
    stepId: string,
    stepName: string,
    plugin: string,
    attributes: Record<string, any> = {},
  ): any {
    const span = this.tracer.startSpan(`step:${stepName}`, {
      parent: parentSpan,
      kind: SpanKind.INTERNAL,
      attributes: {
        'maestro.step.id': stepId,
        'maestro.step.name': stepName,
        'maestro.step.plugin': plugin,
        'maestro.step.attempt': attributes.attempt || 1,
        ...attributes,
      },
    });

    // Record step start
    this.stepExecutionsTotal.add(1, {
      step_plugin: plugin,
      step_name: stepName,
    });

    return span;
  }

  finishStepSpan(
    span: any,
    status: 'succeeded' | 'failed',
    duration: number,
    metadata: Record<string, any> = {},
  ): void {
    // Set span status
    if (status === 'succeeded') {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: metadata.error || 'Step failed',
      });
    }

    // Add metadata
    span.setAttributes({
      'maestro.step.status': status,
      'maestro.step.duration_ms': duration,
      'maestro.step.cost_usd': metadata.cost_usd || 0,
      'maestro.step.output_size': metadata.output_size || 0,
    });

    // Add plugin-specific attributes
    if (metadata.model) {
      span.setAttribute('maestro.ai.model', metadata.model);
    }
    if (metadata.url) {
      span.setAttribute('maestro.http.url', metadata.url);
    }
    if (metadata.status_code) {
      span.setAttribute('maestro.http.status_code', metadata.status_code);
    }

    span.end();

    // Record metrics
    this.stepDuration.record(duration / 1000, {
      step_plugin: span.getAttribute('maestro.step.plugin'),
      status,
      step_name: span.getAttribute('maestro.step.name'),
    });

    if (metadata.cost_usd) {
      this.costTotal.add(metadata.cost_usd, {
        plugin: span.getAttribute('maestro.step.plugin'),
      });
    }

    if (status === 'failed') {
      this.errorRate.add(1, {
        error_type: 'step_failure',
        plugin: span.getAttribute('maestro.step.plugin'),
      });
    }
  }

  // Plugin-specific tracing helpers
  traceAIRequest(
    parentSpan: any,
    provider: string,
    model: string,
    operation: string,
    attributes: Record<string, any> = {},
  ): any {
    return this.tracer.startSpan(`ai:${provider}:${operation}`, {
      parent: parentSpan,
      kind: SpanKind.CLIENT,
      attributes: {
        'ai.provider': provider,
        'ai.model': model,
        'ai.operation': operation,
        'ai.prompt_tokens': attributes.prompt_tokens,
        'ai.completion_tokens': attributes.completion_tokens,
        'ai.total_tokens': attributes.total_tokens,
        ...attributes,
      },
    });
  }

  traceHttpRequest(
    parentSpan: any,
    method: string,
    url: string,
    attributes: Record<string, any> = {},
  ): any {
    return this.tracer.startSpan(`http:${method}`, {
      parent: parentSpan,
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.user_agent': attributes.user_agent,
        ...attributes,
      },
    });
  }

  // Context management
  withSpan<T>(span: any, fn: () => Promise<T>): Promise<T> {
    return context.with(trace.setSpan(context.active(), span), fn);
  }

  getCurrentSpan(): any {
    return trace.getActiveSpan();
  }

  // Metrics helpers
  updateActiveRuns(count: number): void {
    this.activeRunsValue = count;
  }

  recordError(errorType: string, attributes: Record<string, any> = {}): void {
    this.errorRate.add(1, {
      error_type: errorType,
      ...attributes,
    });
  }

  // Baggage and propagation
  injectTraceContext(headers: Record<string, string>): void {
    propagation.inject(context.active(), headers);
  }

  extractTraceContext(headers: Record<string, string>): any {
    return propagation.extract(context.active(), headers);
  }

  // Custom events
  addEvent(name: string, attributes: Record<string, any> = {}): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, {
        timestamp: Date.now(),
        ...attributes,
      });
    }

    // Also emit as EventEmitter event for local handling
    this.emit('trace-event', { name, attributes, timestamp: Date.now() });
  }

  // Health check
  isHealthy(): boolean {
    try {
      // Basic health check - ensure tracer is working
      const testSpan = this.tracer.startSpan('health-check');
      testSpan.end();
      return true;
    } catch (error) {
      console.error('Tracing health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let tracerInstance: MaestroTracer | null = null;

export function initializeTracing(config: TracingConfig): MaestroTracer {
  if (tracerInstance) {
    return tracerInstance;
  }

  tracerInstance = new MaestroTracer(config);
  return tracerInstance;
}

export function getTracer(): MaestroTracer {
  if (!tracerInstance) {
    throw new Error('Tracing not initialized. Call initializeTracing first.');
  }

  return tracerInstance;
}

// Decorator for automatic tracing
export function traced(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracer = getTracer();
      const span = tracer.tracer.startSpan(
        operationName || `${target.constructor.name}.${propertyKey}`,
      );

      try {
        const result = await tracer.withSpan(span, () =>
          originalMethod.apply(this, args),
        );
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}
