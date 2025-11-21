import { logger } from './logger.js';

// Simple metrics collection for observability
// In production, integrate with Prometheus/OpenTelemetry

interface MetricValue {
  value: number;
  timestamp: number;
  labels: Record<string, string>;
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  // Increment a counter
  increment(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.makeKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  // Set a gauge value
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
  }

  // Record a histogram value (for latencies, sizes, etc.)
  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    // Keep last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    this.histograms.set(key, values);
  }

  // Time a function execution
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    labels: Record<string, string> = {}
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.histogram(name, Date.now() - start, { ...labels, status: 'success' });
      return result;
    } catch (error) {
      this.histogram(name, Date.now() - start, { ...labels, status: 'error' });
      throw error;
    }
  }

  // Get all metrics for reporting
  getMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; sum: number; avg: number; p50: number; p95: number; p99: number }>;
  } {
    const histogramStats: Record<string, { count: number; sum: number; avg: number; p50: number; p95: number; p99: number }> = {};

    for (const [key, values] of this.histograms.entries()) {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      histogramStats[key] = {
        count: sorted.length,
        sum,
        avg: sum / sorted.length,
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
      };
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
    };
  }

  // Reset all metrics
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private makeKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

export const metrics = new MetricsCollector();

// Pre-defined metric names
export const MetricNames = {
  // API metrics
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_REQUEST_DURATION_MS: 'http_request_duration_ms',

  // Business metrics
  PRODUCTS_CREATED: 'products_created_total',
  PRODUCTS_PUBLISHED: 'products_published_total',
  TRANSACTIONS_INITIATED: 'transactions_initiated_total',
  TRANSACTIONS_COMPLETED: 'transactions_completed_total',
  TRANSACTIONS_FAILED: 'transactions_failed_total',
  CONSENT_RECORDED: 'consent_recorded_total',
  CONSENT_REVOKED: 'consent_revoked_total',

  // Risk assessment
  RISK_ASSESSMENTS: 'risk_assessments_total',
  RISK_ASSESSMENT_DURATION_MS: 'risk_assessment_duration_ms',

  // Cache metrics
  CACHE_HITS: 'cache_hits_total',
  CACHE_MISSES: 'cache_misses_total',

  // Database metrics
  DB_QUERIES_TOTAL: 'db_queries_total',
  DB_QUERY_DURATION_MS: 'db_query_duration_ms',
};

// Middleware to track HTTP metrics
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const labels = {
        method: req.method,
        path: req.route?.path || req.path,
        status: String(res.statusCode),
      };

      metrics.increment(MetricNames.HTTP_REQUESTS_TOTAL, labels);
      metrics.histogram(MetricNames.HTTP_REQUEST_DURATION_MS, duration, labels);
    });

    next();
  };
}

// Expose metrics endpoint
export function getMetricsHandler() {
  return (_req: any, res: any) => {
    res.json(metrics.getMetrics());
  };
}
