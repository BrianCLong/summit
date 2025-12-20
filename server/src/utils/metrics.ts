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

/**
 * A simple Prometheus metrics collector.
 * Allows creating and updating Gauges, Counters, and Histograms.
 * Note: This implementation stores metrics in memory and is intended for simple use cases or testing.
 * For production, consider using `prom-client`.
 */
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

  /**
   * Registers a new Gauge metric.
   * @param name - The name of the metric.
   * @param help - A help string describing the metric.
   * @param labelNames - Optional array of label names.
   */
  createGauge(name: string, help: string, labelNames: string[] = []): void {
    this.gaugeDefinitions.set(name, { name, help, labelNames });
  }

  /**
   * Registers a new Counter metric.
   * @param name - The name of the metric.
   * @param help - A help string describing the metric.
   * @param labelNames - Optional array of label names.
   */
  createCounter(name: string, help: string, labelNames: string[] = []): void {
    this.counterDefinitions.set(name, { name, help, labelNames });
  }

  /**
   * Registers a new Histogram metric.
   * @param name - The name of the metric.
   * @param help - A help string describing the metric.
   * @param options - Optional configuration, including buckets.
   */
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

  /**
   * Sets the value of a Gauge.
   * @param name - The name of the metric.
   * @param value - The value to set.
   * @param labels - Optional labels for the metric instance.
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.metricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Increments a Counter.
   * @param name - The name of the metric.
   * @param labels - Optional labels for the metric instance.
   * @param value - The amount to increment by (default 1).
   */
  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const key = this.metricKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  /**
   * Observes a value in a Histogram.
   * @param name - The name of the metric.
   * @param value - The value to observe.
   * @param labels - Optional labels for the metric instance.
   */
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
