// @ts-nocheck
import { trace, metrics, SpanStatusCode, Counter, Histogram } from '@opentelemetry/api';

/**
 * Maestro Telemetry Helper
 * Wraps OpenTelemetry APIs to provide a consistent interface for Maestro components.
 */
export class MaestroTelemetry {
  private static _instance: MaestroTelemetry;
  private tracer = trace.getTracer('maestro-orchestrator');
  private meter = metrics.getMeter('maestro-orchestrator');

  // Cache for instruments to avoid recreation overhead
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  private constructor() {}

  public static getInstance(): MaestroTelemetry {
    if (!MaestroTelemetry._instance) {
      MaestroTelemetry._instance = new MaestroTelemetry();
    }
    return MaestroTelemetry._instance;
  }

  /**
   * Wraps a function execution in a span.
   */
  public async trace<T>(name: string, attributes: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
    return this.tracer.startActiveSpan(name, { attributes }, async (span: any) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Records a counter metric.
   */
  public recordCounter(name: string, value: number, attributes: Record<string, unknown> = {}) {
    let counter = this.counters.get(name);
    if (!counter) {
        counter = this.meter.createCounter(name);
        this.counters.set(name, counter);
    }
    counter.add(value, attributes);
  }

  /**
   * Records a histogram metric (e.g. latency).
   */
  public recordHistogram(name: string, value: number, attributes: Record<string, any> = {}) {
    let histogram = this.histograms.get(name);
    if (!histogram) {
        histogram = this.meter.createHistogram(name);
        this.histograms.set(name, histogram);
    }
    histogram.record(value, attributes);
  }
}

export const telemetry = MaestroTelemetry.getInstance();
