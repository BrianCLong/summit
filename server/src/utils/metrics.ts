export type MetricLabels = Record<string, string>;

interface GaugeDefinition {
  name: string;
  help: string;
  labelNames: string[];
}

interface CounterDefinition {
  name: string;
  help: string;
  labelNames: string[];
}

interface HistogramDefinition {
  name: string;
  help: string;
  buckets?: number[];
}

export class PrometheusMetrics {
  private readonly namespace: string;
  private gauges = new Map<string, number>();
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private gaugeDefinitions = new Map<string, GaugeDefinition>();
  private counterDefinitions = new Map<string, CounterDefinition>();
  private histogramDefinitions = new Map<string, HistogramDefinition>();

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  createGauge(name: string, help: string, labelNames: string[] = []): void {
    this.gaugeDefinitions.set(name, { name, help, labelNames });
  }

  createCounter(name: string, help: string, labelNames: string[] = []): void {
    this.counterDefinitions.set(name, { name, help, labelNames });
  }

  createHistogram(
    name: string,
    help: string,
    options: { buckets?: number[] } = {},
  ): void {
    this.histogramDefinitions.set(name, {
      name,
      help,
      buckets: options.buckets,
    });
  }

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.metricKey(name, labels);
    this.gauges.set(key, value);
  }

  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const key = this.metricKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  observeHistogram(
    name: string,
    value: number,
    labels: MetricLabels = {},
  ): void {
    const key = this.metricKey(name, labels);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    if (values.length > 1000) {
      values.shift();
    }
    this.histograms.set(key, values);
  }

  private metricKey(name: string, labels: MetricLabels): string {
    const labelEntries = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('|');
    return labelEntries
      ? `${this.namespace}:${name}:{${labelEntries}}`
      : `${this.namespace}:${name}`;
  }
}
