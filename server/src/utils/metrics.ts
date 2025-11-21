/**
 * Represents key-value labels for metrics.
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
 * A lightweight Prometheus metrics collector.
 * Supports Gauges, Counters, and Histograms.
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
   * Creates a new PrometheusMetrics instance.
   * @param {string} namespace - The namespace for all metrics.
   */
  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Defines a new Gauge metric.
   * @param {string} name - The name of the metric.
   * @param {string} help - The help text for the metric.
   * @param {string[]} [labelNames] - The label names associated with the metric.
   */
  createGauge(name: string, help: string, labelNames: string[] = []): void {
    this.gaugeDefinitions.set(name, { name, help, labelNames });
  }

  /**
   * Defines a new Counter metric.
   * @param {string} name - The name of the metric.
   * @param {string} help - The help text for the metric.
   * @param {string[]} [labelNames] - The label names associated with the metric.
   */
  createCounter(name: string, help: string, labelNames: string[] = []): void {
    this.counterDefinitions.set(name, { name, help, labelNames });
  }

  /**
   * Defines a new Histogram metric.
   * @param {string} name - The name of the metric.
   * @param {string} help - The help text for the metric.
   * @param {object} [options] - Configuration options.
   * @param {number[]} [options.buckets] - Custom bucket boundaries.
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
   * Sets the value of a Gauge metric.
   * @param {string} name - The name of the metric.
   * @param {number} value - The value to set.
   * @param {MetricLabels} [labels] - Labels for the metric instance.
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.metricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Increments a Counter metric.
   * @param {string} name - The name of the metric.
   * @param {MetricLabels} [labels] - Labels for the metric instance.
   * @param {number} [value=1] - The amount to increment by.
   */
  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const key = this.metricKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  /**
   * Observes a value in a Histogram metric.
   * @param {string} name - The name of the metric.
   * @param {number} value - The value to observe.
   * @param {MetricLabels} [labels] - Labels for the metric instance.
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
