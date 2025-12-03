import { MetricEvent, MetricsSink } from './types.js';

export class NoopMetricsSink implements MetricsSink {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  record(_event: MetricEvent): void {}
}

export class InMemoryMetricsSink implements MetricsSink {
  private readonly events: MetricEvent[] = [];
  constructor(private readonly capacity = 500) {}

  record(event: MetricEvent): void {
    this.events.push(event);
    if (this.events.length > this.capacity) {
      this.events.shift();
    }
  }

  getAll(): MetricEvent[] {
    return [...this.events];
  }
}
