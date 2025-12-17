/**
 * CompanyOS Tenant API - Metrics Middleware
 *
 * Prometheus-compatible metrics for observability
 */

import type { Request, Response, NextFunction } from 'express';

// Simple in-memory metrics store
// TODO: Replace with proper Prometheus client (prom-client) in production
interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

class MetricsRegistry {
  private counters: Map<string, MetricValue[]> = new Map();
  private histograms: Map<string, MetricValue[]> = new Map();
  private gauges: Map<string, MetricValue> = new Map();

  incrementCounter(
    name: string,
    labels: Record<string, string> = {},
    value: number = 1,
  ) {
    const key = this.makeKey(name, labels);
    const existing = this.counters.get(key) || [];
    existing.push({ value, labels, timestamp: Date.now() });
    this.counters.set(key, existing);
  }

  observeHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ) {
    const key = this.makeKey(name, labels);
    const existing = this.histograms.get(key) || [];
    existing.push({ value, labels, timestamp: Date.now() });
    this.histograms.set(key, existing);
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, { value, labels, timestamp: Date.now() });
  }

  private makeKey(name: string, labels: Record<string, string>): string {
    const sortedLabels = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${sortedLabels}}`;
  }

  toPrometheusFormat(): string {
    const lines: string[] = [];

    // Counters
    for (const [key, values] of this.counters) {
      const total = values.reduce((acc, v) => acc + v.value, 0);
      lines.push(`${key} ${total}`);
    }

    // Histograms (simplified - just count and sum)
    const histogramGroups = new Map<string, MetricValue[]>();
    for (const [key, values] of this.histograms) {
      const baseName = key.split('{')[0];
      const existing = histogramGroups.get(baseName) || [];
      existing.push(...values);
      histogramGroups.set(baseName, existing);
    }

    for (const [name, values] of histogramGroups) {
      const count = values.length;
      const sum = values.reduce((acc, v) => acc + v.value, 0);
      lines.push(`${name}_count ${count}`);
      lines.push(`${name}_sum ${sum.toFixed(3)}`);
    }

    // Gauges
    for (const [key, metric] of this.gauges) {
      lines.push(`${key} ${metric.value}`);
    }

    return lines.join('\n');
  }
}

export const metrics = new MetricsRegistry();

// Predefined metrics
export const METRICS = {
  HTTP_REQUESTS_TOTAL: 'companyos_tenant_api_http_requests_total',
  HTTP_REQUEST_DURATION_SECONDS: 'companyos_tenant_api_http_request_duration_seconds',
  TENANT_OPERATIONS_TOTAL: 'companyos_tenant_operations_total',
  FEATURE_FLAG_EVALUATIONS_TOTAL: 'companyos_feature_flag_evaluations_total',
  ACTIVE_TENANTS: 'companyos_active_tenants',
  GRAPHQL_REQUESTS_TOTAL: 'companyos_tenant_api_graphql_requests_total',
  GRAPHQL_ERRORS_TOTAL: 'companyos_tenant_api_graphql_errors_total',
};

/**
 * HTTP request metrics middleware
 */
export function httpMetrics(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();
  const path = req.route?.path || req.path;

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - startTime);
    const durationSeconds = durationNs / 1e9;

    const labels = {
      method: req.method,
      path: path,
      status: String(res.statusCode),
    };

    metrics.incrementCounter(METRICS.HTTP_REQUESTS_TOTAL, labels);
    metrics.observeHistogram(METRICS.HTTP_REQUEST_DURATION_SECONDS, durationSeconds, labels);
  });

  next();
}

/**
 * Record tenant operation metric
 */
export function recordTenantOperation(
  operation: 'create' | 'read' | 'update' | 'delete' | 'list',
  tenantId?: string,
  success: boolean = true,
) {
  metrics.incrementCounter(METRICS.TENANT_OPERATIONS_TOTAL, {
    operation,
    tenant_id: tenantId || 'unknown',
    success: String(success),
  });
}

/**
 * Record feature flag evaluation metric
 */
export function recordFeatureFlagEvaluation(
  flagName: string,
  tenantId: string,
  enabled: boolean,
) {
  metrics.incrementCounter(METRICS.FEATURE_FLAG_EVALUATIONS_TOTAL, {
    flag_name: flagName,
    tenant_id: tenantId,
    enabled: String(enabled),
  });
}

/**
 * Metrics endpoint handler
 */
export function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(metrics.toPrometheusFormat());
}
