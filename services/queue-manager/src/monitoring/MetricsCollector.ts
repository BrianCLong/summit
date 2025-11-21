import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export class MetricsCollector {
  private registry: Registry;
  private jobsAdded: Counter;
  private jobsProcessing: Gauge;
  private jobsCompleted: Counter;
  private jobsFailed: Counter;
  private jobProcessingDuration: Histogram;
  private queueMetrics: Map<
    string,
    {
      throughput: number[];
      processingTimes: number[];
      errors: number;
      total: number;
    }
  > = new Map();

  constructor() {
    this.registry = new Registry();

    this.jobsAdded = new Counter({
      name: 'queue_jobs_added_total',
      help: 'Total number of jobs added to queues',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.jobsProcessing = new Gauge({
      name: 'queue_jobs_processing',
      help: 'Number of jobs currently being processed',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.jobsCompleted = new Counter({
      name: 'queue_jobs_completed_total',
      help: 'Total number of jobs completed',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.jobsFailed = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total number of jobs failed',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.jobProcessingDuration = new Histogram({
      name: 'queue_job_processing_duration_ms',
      help: 'Job processing duration in milliseconds',
      labelNames: ['queue'],
      buckets: [10, 50, 100, 500, 1000, 5000, 10000, 30000, 60000],
      registers: [this.registry],
    });
  }

  recordJobAdded(queueName: string, count: number = 1): void {
    this.jobsAdded.inc({ queue: queueName }, count);
    this.initQueueMetrics(queueName);
    this.queueMetrics.get(queueName)!.total += count;
  }

  recordJobStart(queueName: string): void {
    this.jobsProcessing.inc({ queue: queueName });
    this.initQueueMetrics(queueName);
  }

  recordJobComplete(queueName: string, duration: number): void {
    this.jobsProcessing.dec({ queue: queueName });
    this.jobsCompleted.inc({ queue: queueName });
    this.jobProcessingDuration.observe({ queue: queueName }, duration);

    const metrics = this.queueMetrics.get(queueName);
    if (metrics) {
      metrics.processingTimes.push(duration);
      metrics.throughput.push(Date.now());
      // Keep only last 1000 data points
      if (metrics.processingTimes.length > 1000) {
        metrics.processingTimes.shift();
      }
      if (metrics.throughput.length > 1000) {
        metrics.throughput.shift();
      }
    }
  }

  recordJobFailed(queueName: string, duration: number): void {
    this.jobsProcessing.dec({ queue: queueName });
    this.jobsFailed.inc({ queue: queueName });
    this.jobProcessingDuration.observe({ queue: queueName }, duration);

    const metrics = this.queueMetrics.get(queueName);
    if (metrics) {
      metrics.errors++;
    }
  }

  getQueueMetrics(queueName: string) {
    const metrics = this.queueMetrics.get(queueName);
    if (!metrics) {
      return {
        throughput: 0,
        avgProcessingTime: 0,
        errorRate: 0,
      };
    }

    // Calculate throughput (jobs per minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentJobs = metrics.throughput.filter((t) => t > oneMinuteAgo);
    const throughput = recentJobs.length;

    // Calculate average processing time
    const avgProcessingTime =
      metrics.processingTimes.length > 0
        ? metrics.processingTimes.reduce((a, b) => a + b, 0) /
          metrics.processingTimes.length
        : 0;

    // Calculate error rate
    const errorRate = metrics.total > 0 ? (metrics.errors / metrics.total) * 100 : 0;

    return {
      throughput,
      avgProcessingTime: Math.round(avgProcessingTime),
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  getPrometheusMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  private initQueueMetrics(queueName: string): void {
    if (!this.queueMetrics.has(queueName)) {
      this.queueMetrics.set(queueName, {
        throughput: [],
        processingTimes: [],
        errors: 0,
        total: 0,
      });
    }
  }
}
