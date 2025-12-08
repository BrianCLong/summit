import { PipelineMetricsSnapshot } from './types.js';

type MetricField = Exclude<keyof PipelineMetricsSnapshot, 'source'>;

export class PipelineMonitor {
  private readonly metrics: Map<string, PipelineMetricsSnapshot> = new Map();

  increment(source: string, field: MetricField): void {
    const snapshot = this.metrics.get(source) ?? {
      source,
      processed: 0,
      succeeded: 0,
      failed: 0,
      deduplicated: 0,
      filtered: 0,
      qualityFailures: 0,
      ingestionErrors: 0,
    };
    snapshot[field] += 1;
    this.metrics.set(source, snapshot);
  }

  snapshot(): PipelineMetricsSnapshot[] {
    return Array.from(this.metrics.values());
  }
}
