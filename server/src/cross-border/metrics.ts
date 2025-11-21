/**
 * Cross-Border Module Metrics
 *
 * Prometheus-compatible metrics for monitoring cross-border operations.
 */

/**
 * Metric types
 */
export interface MetricLabels {
  [key: string]: string;
}

export interface CounterMetric {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

export interface GaugeMetric {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

export interface HistogramMetric {
  name: string;
  help: string;
  labels: string[];
  buckets: number[];
  values: Map<string, { count: number; sum: number; buckets: number[] }>;
}

/**
 * Cross-border metrics collector
 */
export class CrossBorderMetrics {
  private counters: Map<string, CounterMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Counters
    this.registerCounter(
      'cross_border_handovers_total',
      'Total number of handover attempts',
      ['source_nation', 'target_nation', 'status']
    );

    this.registerCounter(
      'cross_border_messages_total',
      'Total number of cross-border messages',
      ['session_id', 'type', 'language']
    );

    this.registerCounter(
      'cross_border_translations_total',
      'Total number of translation requests',
      ['source_language', 'target_language', 'status']
    );

    this.registerCounter(
      'cross_border_circuit_breaker_trips_total',
      'Total circuit breaker trips',
      ['partner_id']
    );

    this.registerCounter(
      'cross_border_rate_limit_exceeded_total',
      'Total rate limit exceeded events',
      ['partner_id']
    );

    // Gauges
    this.registerGauge(
      'cross_border_active_sessions',
      'Number of active cross-border sessions',
      []
    );

    this.registerGauge(
      'cross_border_active_partners',
      'Number of active partner nations',
      []
    );

    this.registerGauge(
      'cross_border_partner_health',
      'Health status of partner nations (1=healthy, 0=unhealthy)',
      ['partner_id', 'partner_code']
    );

    this.registerGauge(
      'cross_border_circuit_breaker_state',
      'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      ['partner_id']
    );

    // Histograms
    this.registerHistogram(
      'cross_border_handover_duration_seconds',
      'Duration of handover operations',
      ['source_nation', 'target_nation'],
      [0.1, 0.5, 1, 2, 5, 10, 30]
    );

    this.registerHistogram(
      'cross_border_translation_duration_seconds',
      'Duration of translation operations',
      ['source_language', 'target_language'],
      [0.01, 0.05, 0.1, 0.25, 0.5, 1]
    );

    this.registerHistogram(
      'cross_border_partner_latency_seconds',
      'Partner endpoint latency',
      ['partner_id'],
      [0.1, 0.25, 0.5, 1, 2, 5]
    );
  }

  // Counter methods
  private registerCounter(name: string, help: string, labels: string[]): void {
    this.counters.set(name, { name, help, labels, values: new Map() });
  }

  incCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const counter = this.counters.get(name);
    if (!counter) return;

    const key = this.labelsToKey(labels);
    const current = counter.values.get(key) || 0;
    counter.values.set(key, current + value);
  }

  // Gauge methods
  private registerGauge(name: string, help: string, labels: string[]): void {
    this.gauges.set(name, { name, help, labels, values: new Map() });
  }

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const gauge = this.gauges.get(name);
    if (!gauge) return;

    const key = this.labelsToKey(labels);
    gauge.values.set(key, value);
  }

  incGauge(name: string, labels: MetricLabels = {}, value = 1): void {
    const gauge = this.gauges.get(name);
    if (!gauge) return;

    const key = this.labelsToKey(labels);
    const current = gauge.values.get(key) || 0;
    gauge.values.set(key, current + value);
  }

  decGauge(name: string, labels: MetricLabels = {}, value = 1): void {
    this.incGauge(name, labels, -value);
  }

  // Histogram methods
  private registerHistogram(
    name: string,
    help: string,
    labels: string[],
    buckets: number[]
  ): void {
    this.histograms.set(name, {
      name,
      help,
      labels,
      buckets: buckets.sort((a, b) => a - b),
      values: new Map(),
    });
  }

  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const histogram = this.histograms.get(name);
    if (!histogram) return;

    const key = this.labelsToKey(labels);
    let data = histogram.values.get(key);
    if (!data) {
      data = {
        count: 0,
        sum: 0,
        buckets: new Array(histogram.buckets.length).fill(0),
      };
      histogram.values.set(key, data);
    }

    data.count++;
    data.sum += value;

    for (let i = 0; i < histogram.buckets.length; i++) {
      if (value <= histogram.buckets[i]) {
        data.buckets[i]++;
      }
    }
  }

  // Helper to create timer for histograms
  startTimer(
    histogramName: string,
    labels: MetricLabels = {}
  ): () => void {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      const durationSeconds = Number(end - start) / 1e9;
      this.observeHistogram(histogramName, durationSeconds, labels);
    };
  }

  // Utility methods
  private labelsToKey(labels: MetricLabels): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  private keyToLabels(key: string): string {
    if (!key) return '';
    return `{${key}}`;
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const [labels, value] of counter.values) {
        lines.push(`${counter.name}${this.keyToLabels(labels)} ${value}`);
      }
      lines.push('');
    }

    // Export gauges
    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      for (const [labels, value] of gauge.values) {
        lines.push(`${gauge.name}${this.keyToLabels(labels)} ${value}`);
      }
      lines.push('');
    }

    // Export histograms
    for (const histogram of this.histograms.values()) {
      lines.push(`# HELP ${histogram.name} ${histogram.help}`);
      lines.push(`# TYPE ${histogram.name} histogram`);
      for (const [labels, data] of histogram.values) {
        const labelStr = this.keyToLabels(labels);
        for (let i = 0; i < histogram.buckets.length; i++) {
          const bucketLabels = labels
            ? `{${labels},le="${histogram.buckets[i]}"}`
            : `{le="${histogram.buckets[i]}"}`;
          lines.push(`${histogram.name}_bucket${bucketLabels} ${data.buckets[i]}`);
        }
        const infLabels = labels ? `{${labels},le="+Inf"}` : `{le="+Inf"}`;
        lines.push(`${histogram.name}_bucket${infLabels} ${data.count}`);
        lines.push(`${histogram.name}_sum${labelStr} ${data.sum}`);
        lines.push(`${histogram.name}_count${labelStr} ${data.count}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const counter of this.counters.values()) {
      result[counter.name] = Object.fromEntries(counter.values);
    }

    for (const gauge of this.gauges.values()) {
      result[gauge.name] = Object.fromEntries(gauge.values);
    }

    for (const histogram of this.histograms.values()) {
      result[histogram.name] = Object.fromEntries(
        Array.from(histogram.values.entries()).map(([k, v]) => [
          k,
          { ...v, buckets: Object.fromEntries(histogram.buckets.map((b, i) => [b, v.buckets[i]])) },
        ])
      );
    }

    return result;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const counter of this.counters.values()) {
      counter.values.clear();
    }
    for (const gauge of this.gauges.values()) {
      gauge.values.clear();
    }
    for (const histogram of this.histograms.values()) {
      histogram.values.clear();
    }
  }
}

// Singleton
let metricsInstance: CrossBorderMetrics | null = null;

export function getCrossBorderMetrics(): CrossBorderMetrics {
  if (!metricsInstance) {
    metricsInstance = new CrossBorderMetrics();
  }
  return metricsInstance;
}

// Convenience functions
export function recordHandover(
  sourceNation: string,
  targetNation: string,
  status: 'success' | 'failed' | 'timeout',
  durationSeconds: number
): void {
  const metrics = getCrossBorderMetrics();
  metrics.incCounter('cross_border_handovers_total', {
    source_nation: sourceNation,
    target_nation: targetNation,
    status,
  });
  metrics.observeHistogram('cross_border_handover_duration_seconds', durationSeconds, {
    source_nation: sourceNation,
    target_nation: targetNation,
  });
}

export function recordTranslation(
  sourceLanguage: string,
  targetLanguage: string,
  status: 'success' | 'failed',
  durationSeconds: number
): void {
  const metrics = getCrossBorderMetrics();
  metrics.incCounter('cross_border_translations_total', {
    source_language: sourceLanguage,
    target_language: targetLanguage,
    status,
  });
  metrics.observeHistogram('cross_border_translation_duration_seconds', durationSeconds, {
    source_language: sourceLanguage,
    target_language: targetLanguage,
  });
}

export function recordPartnerHealth(
  partnerId: string,
  partnerCode: string,
  healthy: boolean,
  latencySeconds: number
): void {
  const metrics = getCrossBorderMetrics();
  metrics.setGauge('cross_border_partner_health', healthy ? 1 : 0, {
    partner_id: partnerId,
    partner_code: partnerCode,
  });
  if (latencySeconds >= 0) {
    metrics.observeHistogram('cross_border_partner_latency_seconds', latencySeconds, {
      partner_id: partnerId,
    });
  }
}

export function updateActiveSessions(count: number): void {
  getCrossBorderMetrics().setGauge('cross_border_active_sessions', count);
}

export function updateActivePartners(count: number): void {
  getCrossBorderMetrics().setGauge('cross_border_active_partners', count);
}
