/**
 * Build Telemetry and Observability - Composer vNext Sprint
 * OTEL spans + metrics integration for build dashboard
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, metrics, Span } from '@opentelemetry/api';
import {
  PrometheusRegistry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

export interface BuildMetrics {
  buildDuration: Histogram<string>;
  buildCount: Counter<string>;
  cacheHitRate: Gauge<string>;
  taskDuration: Histogram<string>;
  parallelEfficiency: Gauge<string>;
  errorRate: Counter<string>;
}

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  endpoint?: string;
  exportInterval?: number;
  enableMetrics?: boolean;
  enableTraces?: boolean;
}

export class BuildTelemetry {
  private sdk: NodeSDK;
  private tracer = trace.getTracer('maestro-build');
  private meter = metrics.getMeter('maestro-build');
  private registry: PrometheusRegistry;
  private buildMetrics: BuildMetrics;
  private currentBuildSpan?: Span;

  constructor(private config: TelemetryConfig) {
    this.registry = new PrometheusRegistry();
    this.buildMetrics = this.initializeMetrics();
    this.sdk = this.initializeSDK();

    // Collect default system metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'maestro_build_',
    });
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  private initializeSDK(): NodeSDK {
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]:
          this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV || 'development',
      }),
    );

    const sdk = new NodeSDK({
      resource,
      instrumentations: [], // Add auto-instrumentations as needed
    });

    sdk.start();
    return sdk;
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics(): BuildMetrics {
    const buildDuration = new Histogram({
      name: 'maestro_build_duration_seconds',
      help: 'Build execution duration in seconds',
      labelNames: ['service', 'status', 'cache_enabled'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600],
      registers: [this.registry],
    });

    const buildCount = new Counter({
      name: 'maestro_build_total',
      help: 'Total number of builds',
      labelNames: ['service', 'status', 'trigger'],
      registers: [this.registry],
    });

    const cacheHitRate = new Gauge({
      name: 'maestro_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['service', 'cache_type'],
      registers: [this.registry],
    });

    const taskDuration = new Histogram({
      name: 'maestro_task_duration_seconds',
      help: 'Individual task duration in seconds',
      labelNames: ['task_name', 'status', 'cache_hit'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
      registers: [this.registry],
    });

    const parallelEfficiency = new Gauge({
      name: 'maestro_parallel_efficiency',
      help: 'Build parallelization efficiency percentage',
      labelNames: ['service'],
      registers: [this.registry],
    });

    const errorRate = new Counter({
      name: 'maestro_build_errors_total',
      help: 'Total build errors',
      labelNames: ['service', 'error_type', 'task_name'],
      registers: [this.registry],
    });

    return {
      buildDuration,
      buildCount,
      cacheHitRate,
      taskDuration,
      parallelEfficiency,
      errorRate,
    };
  }

  /**
   * Start build trace
   */
  startBuild(
    buildId: string,
    serviceName: string,
    trigger: string = 'manual',
  ): Span {
    this.currentBuildSpan = this.tracer.startSpan('build.execute', {
      attributes: {
        'build.id': buildId,
        'build.service': serviceName,
        'build.trigger': trigger,
        'build.start_time': Date.now(),
      },
    });

    this.buildMetrics.buildCount.inc({
      service: serviceName,
      status: 'started',
      trigger,
    });

    console.log(`📊 Started build telemetry: ${buildId}`);
    return this.currentBuildSpan;
  }

  /**
   * Record build completion
   */
  finishBuild(
    buildId: string,
    serviceName: string,
    duration: number,
    status: 'success' | 'failed',
    cacheEnabled: boolean = false,
  ): void {
    if (this.currentBuildSpan) {
      this.currentBuildSpan.setAttributes({
        'build.duration': duration,
        'build.status': status,
        'build.cache_enabled': cacheEnabled,
      });

      this.currentBuildSpan.end();
    }

    this.buildMetrics.buildDuration.observe(
      { service: serviceName, status, cache_enabled: cacheEnabled.toString() },
      duration / 1000,
    );

    this.buildMetrics.buildCount.inc({
      service: serviceName,
      status,
      trigger: 'completed',
    });

    console.log(`✅ Finished build telemetry: ${buildId} (${status})`);
  }

  /**
   * Track individual task execution
   */
  trackTask(
    taskName: string,
    duration: number,
    status: 'success' | 'failed' | 'skipped',
    cacheHit: boolean = false,
  ): Span {
    const span = this.tracer.startSpan('task.execute', {
      attributes: {
        'task.name': taskName,
        'task.duration': duration,
        'task.status': status,
        'task.cache_hit': cacheHit,
      },
    });

    this.buildMetrics.taskDuration.observe(
      { task_name: taskName, status, cache_hit: cacheHit.toString() },
      duration / 1000,
    );

    span.end();
    return span;
  }

  /**
   * Update cache statistics
   */
  updateCacheStats(
    serviceName: string,
    cacheType: string,
    hitRate: number,
    totalRequests: number,
    hits: number,
  ): void {
    this.cacheHitRate.set(
      { service: serviceName, cache_type: cacheType },
      hitRate,
    );

    // Create child spans for cache operations
    const span = this.tracer.startSpan('cache.stats', {
      attributes: {
        'cache.type': cacheType,
        'cache.hit_rate': hitRate,
        'cache.total_requests': totalRequests,
        'cache.hits': hits,
      },
    });

    span.end();
  }

  /**
   * Record build error
   */
  recordError(
    serviceName: string,
    errorType: string,
    taskName?: string,
    error?: Error,
  ): void {
    this.buildMetrics.errorRate.inc({
      service: serviceName,
      error_type: errorType,
      task_name: taskName || 'unknown',
    });

    const span = this.tracer.startSpan('build.error', {
      attributes: {
        'error.type': errorType,
        'error.message': error?.message || 'Unknown error',
        'task.name': taskName || 'unknown',
      },
    });

    if (error) {
      span.recordException(error);
    }

    span.end();
  }

  /**
   * Update parallel efficiency metric
   */
  updateParallelEfficiency(serviceName: string, efficiency: number): void {
    this.buildMetrics.parallelEfficiency.set(
      { service: serviceName },
      efficiency,
    );
  }

  /**
   * Get metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Create custom measurement
   */
  createMeasurement(
    name: string,
    value: number,
    attributes: Record<string, string> = {},
  ): void {
    const span = this.tracer.startSpan(`measurement.${name}`, { attributes });
    span.setAttributes({ [`measurement.${name}.value`]: value });
    span.end();
  }

  /**
   * Export current traces and metrics
   */
  async exportData(): Promise<{
    traces: any[];
    metrics: string;
  }> {
    // In a real implementation, this would collect from the OTEL SDK
    const metrics = await this.getMetrics();

    return {
      traces: [], // Would be collected from trace provider
      metrics,
    };
  }

  /**
   * Shutdown telemetry gracefully
   */
  async shutdown(): Promise<void> {
    if (this.currentBuildSpan) {
      this.currentBuildSpan.end();
    }

    await this.sdk.shutdown();
    console.log('📊 Telemetry shutdown complete');
  }

  /**
   * Generate dashboard data
   */
  generateDashboardData(): {
    buildSummary: any;
    taskBreakdown: any[];
    cacheMetrics: any;
    errorSummary: any;
  } {
    // This would integrate with a time series database in production
    return {
      buildSummary: {
        totalBuilds: 42,
        successRate: 94.2,
        averageDuration: 125000,
        trendsLast7Days: [120, 115, 130, 125, 118, 122, 125],
      },
      taskBreakdown: [
        { name: 'compile-ts', avgDuration: 8000, cacheHitRate: 65 },
        { name: 'bundle-client', avgDuration: 12000, cacheHitRate: 80 },
        { name: 'run-tests', avgDuration: 15000, cacheHitRate: 45 },
      ],
      cacheMetrics: {
        overallHitRate: 72.5,
        localCache: 68.2,
        remoteCache: 76.8,
        sizeMB: 1250,
        evictions: 23,
      },
      errorSummary: {
        totalErrors: 8,
        byType: {
          compilation: 3,
          test_failure: 4,
          timeout: 1,
        },
        resolution: {
          fixed: 6,
          pending: 2,
        },
      },
    };
  }
}

// Factory function
export function createBuildTelemetry(config: TelemetryConfig): BuildTelemetry {
  return new BuildTelemetry(config);
}

// Express middleware for metrics endpoint
export function metricsMiddleware(telemetry: BuildTelemetry) {
  return async (req: any, res: any) => {
    try {
      const metrics = await telemetry.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      res.status(500).send('Error collecting metrics');
    }
  };
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const telemetry = createBuildTelemetry({
    serviceName: 'maestro-build',
    serviceVersion: '1.0.0',
    enableMetrics: true,
    enableTraces: true,
  });

  // Simulate a build
  const buildSpan = telemetry.startBuild('build-123', 'example-service');

  // Simulate some tasks
  telemetry.trackTask('compile', 5000, 'success', false);
  telemetry.trackTask('test', 10000, 'success', true);
  telemetry.trackTask('package', 3000, 'success', false);

  // Update cache stats
  telemetry.updateCacheStats('example-service', 'remote', 75.5, 100, 75);

  // Finish build
  telemetry.finishBuild('build-123', 'example-service', 18000, 'success', true);

  // Print metrics
  telemetry.getMetrics().then((metrics) => {
    console.log('\n📊 Generated Metrics:');
    console.log('='.repeat(40));
    console.log(metrics);
  });

  // Cleanup
  setTimeout(() => {
    telemetry.shutdown();
  }, 1000);
}
