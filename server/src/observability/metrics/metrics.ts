import { registry } from '../metrics.js';
import { Counter, Histogram, Gauge, Metric } from 'prom-client';

export interface Metrics {
  incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
}

// Pre-defined metrics configurations to ensure consistency and prevent runtime errors
const METRIC_DEFINITIONS: Record<string, { type: 'counter' | 'histogram' | 'gauge'; help: string; labelNames: string[] }> = {
  'summit_api_requests_total': {
    type: 'counter',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status', 'tenantId']
  },
  'summit_api_latency_seconds': {
    type: 'histogram',
    help: 'API Latency distribution',
    labelNames: ['method', 'route']
  },
  'summit_errors_total': {
    type: 'counter',
    help: 'Global error counter',
    labelNames: ['code', 'component', 'tenantId']
  },
  'summit_maestro_runs_total': {
    type: 'counter',
    help: 'Maestro orchestration runs',
    labelNames: ['status', 'tenantId']
  },
  'summit_maestro_run_duration_seconds': {
    type: 'histogram',
    help: 'Time to complete a run',
    labelNames: ['status', 'tenantId']
  },
  'summit_maestro_task_duration_seconds': {
    type: 'histogram',
    help: 'Time to complete a task',
    labelNames: ['status', 'agent', 'tenantId']
  },
  'summit_llm_requests_total': {
    type: 'counter',
    help: 'LLM calls',
    labelNames: ['provider', 'model', 'status', 'tenantId']
  },
  'summit_llm_latency_seconds': {
    type: 'histogram',
    help: 'LLM latency',
    labelNames: ['provider', 'model']
  },
  'summit_llm_tokens_total': {
    type: 'counter',
    help: 'LLM token usage',
    labelNames: ['provider', 'model', 'kind']
  },
  'summit_webhook_deliveries_total': {
    type: 'counter',
    help: 'Webhook deliveries',
    labelNames: ['status', 'provider']
  }
};

class PrometheusMetricsService implements Metrics {
  private metrics: Map<string, Metric<string>> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    for (const [name, config] of Object.entries(METRIC_DEFINITIONS)) {
      if (registry.getSingleMetric(name)) {
        // Already registered, grab it
        this.metrics.set(name, registry.getSingleMetric(name) as Metric<string>);
        continue;
      }

      let metric: Metric<string>;
      switch (config.type) {
        case 'counter':
          metric = new Counter({
            name,
            help: config.help,
            labelNames: config.labelNames,
            registers: [registry]
          });
          break;
        case 'histogram':
          metric = new Histogram({
            name,
            help: config.help,
            labelNames: config.labelNames,
            registers: [registry],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60]
          });
          break;
        case 'gauge':
          metric = new Gauge({
            name,
            help: config.help,
            labelNames: config.labelNames,
            registers: [registry]
          });
          break;
      }
      this.metrics.set(name, metric);
    }
  }

  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof Counter) {
      metric.inc(labels, value);
    } else {
      // Fallback or log warning for undefined metric
      // For now, we allow dynamic creation only if explicitly not strict, but strict is safer.
      // We will try to register it dynamically if missing, but using provided labels.
      // This mimics previous behavior but is risky.
      // Better to just ignore or warn in MVP to enforce standards.
    }
  }

  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof Histogram) {
      metric.observe(labels, value);
    }
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof Gauge) {
      metric.set(labels, value);
    }
  }
}

export const metrics = new PrometheusMetricsService();
