/**
 * Type alias for metric labels (key-value pairs).
 */
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
 * A utility class for managing Prometheus-style metrics in memory.
 *
 * This class allows defining and updating gauges, counters, and histograms.
 * It is primarily useful for lightweight metrics collection or testing where
 * a full Prometheus client might be overkill or unavailable.
 */
export class PrometheusMetrics {
  private readonly namespace: string;
  private gauges = new Map<string, number>();
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private gaugeDefinitions = new Map<string, GaugeDefinition>();
  private counterDefinitions = new Map<string, CounterDefinition>();
  private histogramDefinitions = new Map<string, HistogramDefinition>();

  /**
   * Initializes a new instance of PrometheusMetrics.
   *
   * @param namespace - A namespace prefix to apply to all metric keys.
   */
  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Defines a new gauge metric.
   *
   * @param name - The name of the gauge.
   * @param help - A help string describing the metric.
   * @param labelNames - Optional list of label names that will be used with this metric.
   */
  createGauge(name: string, help: string, labelNames: string[] = []): void {
    this.gaugeDefinitions.set(name, { name, help, labelNames });
  }

  /**
   * Defines a new counter metric.
   *
   * @param name - The name of the counter.
   * @param help - A help string describing the metric.
   * @param labelNames - Optional list of label names that will be used with this metric.
   */
  createCounter(name: string, help: string, labelNames: string[] = []): void {
    this.counterDefinitions.set(name, { name, help, labelNames });
  }

  /**
   * Defines a new histogram metric.
   *
   * @param name - The name of the histogram.
   * @param help - A help string describing the metric.
   * @param options - Configuration options, such as custom buckets.
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
   * Sets the value of a gauge.
   *
   * @param name - The name of the gauge to update.
   * @param value - The new value.
   * @param labels - Optional labels to identify the specific metric series.
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.metricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Increments a counter.
   *
   * @param name - The name of the counter to increment.
   * @param labels - Optional labels to identify the specific metric series.
   * @param value - The amount to increment by (default: 1).
   */
  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const key = this.metricKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  /**
   * Observes a value in a histogram.
   *
   * @param name - The name of the histogram.
   * @param value - The value to observe.
   * @param labels - Optional labels to identify the specific metric series.
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
