import type { MetricsRegistry } from './types.js';

interface CounterState {
  readonly type: 'counter';
  value: number;
}

interface GaugeState {
  readonly type: 'gauge';
  value: number;
}

interface DurationState {
  readonly type: 'duration';
  count: number;
  total: number;
}

type MetricState = CounterState | GaugeState | DurationState;

export class InMemoryMetricsRegistry implements MetricsRegistry {
  private readonly metrics = new Map<string, MetricState>();

  recordCounter(name: string, value: number = 1): void {
    const existing = this.metrics.get(name);
    if (existing && existing.type === 'counter') {
      existing.value += value;
      return;
    }
    this.metrics.set(name, { type: 'counter', value });
  }

  recordGauge(name: string, value: number): void {
    const existing = this.metrics.get(name);
    if (existing && existing.type === 'gauge') {
      existing.value = value;
      return;
    }
    this.metrics.set(name, { type: 'gauge', value });
  }

  recordDuration(name: string, durationMs: number): void {
    const existing = this.metrics.get(name);
    if (existing && existing.type === 'duration') {
      existing.count += 1;
      existing.total += durationMs;
      return;
    }
    this.metrics.set(name, { type: 'duration', count: 1, total: durationMs });
  }

  snapshot(): Record<string, number> {
    const view: Record<string, number> = {};
    for (const [key, metric] of this.metrics.entries()) {
      if (metric.type === 'counter' || metric.type === 'gauge') {
        view[key] = metric.value;
      } else {
        view[`${key}.avg`] = metric.total / metric.count;
        view[`${key}.count`] = metric.count;
      }
    }
    return view;
  }
}

export function createMetricsRegistry(): MetricsRegistry {
  return new InMemoryMetricsRegistry();
}
