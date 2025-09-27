/**
 * Prometheus Metrics Definitions for IntelGraph Gateway
 *
 * Defines all metrics used for SLO monitoring and observability,
 * including histograms for latency tracking and counters for
 * request/error rate monitoring.
 */

import { MetricDefinition } from './types';

/**
 * Gateway service metrics for SLO monitoring
 */
export const GATEWAY_METRICS: MetricDefinition[] = [
  // NLQ Processing Metrics
  {
    name: 'intelgraph_nlq_processing_duration_seconds',
    type: 'histogram',
    help: 'Time spent processing natural language queries into Cypher',
    labels: ['tenant_id', 'user_id', 'query_type', 'complexity', 'model_version'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  },
  {
    name: 'intelgraph_nlq_requests_total',
    type: 'counter',
    help: 'Total number of natural language query requests',
    labels: ['tenant_id', 'status', 'query_type', 'endpoint']
  },
  {
    name: 'intelgraph_nlq_translation_quality_score_total',
    type: 'counter',
    help: 'Total quality score for NL→Cypher translations (0-1 scale)',
    labels: ['tenant_id', 'model_version', 'quality_band']
  },

  // Cypher Execution Metrics
  {
    name: 'intelgraph_cypher_execution_duration_seconds',
    type: 'histogram',
    help: 'Time spent executing Cypher queries against Neo4j',
    labels: ['database', 'query_type', 'complexity', 'tenant_id', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
  },
  {
    name: 'intelgraph_cypher_executions_total',
    type: 'counter',
    help: 'Total number of Cypher query executions',
    labels: ['database', 'status', 'query_type', 'tenant_id']
  },
  {
    name: 'intelgraph_cypher_result_size_total',
    type: 'counter',
    help: 'Total size of Cypher query results in records',
    labels: ['database', 'query_type', 'tenant_id']
  },

  // End-to-End Request Metrics
  {
    name: 'intelgraph_request_duration_seconds',
    type: 'histogram',
    help: 'Total request duration from gateway perspective',
    labels: ['method', 'endpoint', 'status', 'tenant_id', 'route'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
  },
  {
    name: 'intelgraph_requests_total',
    type: 'counter',
    help: 'Total number of requests handled by gateway',
    labels: ['method', 'endpoint', 'status', 'tenant_id']
  },

  // Constraint and Guardrail Metrics
  {
    name: 'intelgraph_constraint_violations_total',
    type: 'counter',
    help: 'Total number of constraint violations detected',
    labels: ['constraint_type', 'severity', 'tenant_id', 'action']
  },
  {
    name: 'intelgraph_guardrail_blocks_total',
    type: 'counter',
    help: 'Total number of requests blocked by guardrails',
    labels: ['guardrail_type', 'reason', 'tenant_id']
  },

  // Cache and Performance Metrics
  {
    name: 'intelgraph_cache_operations_total',
    type: 'counter',
    help: 'Total number of cache operations',
    labels: ['cache_type', 'operation', 'result', 'tenant_id']
  },
  {
    name: 'intelgraph_cache_hit_ratio',
    type: 'gauge',
    help: 'Cache hit ratio for various cache types',
    labels: ['cache_type', 'tenant_id']
  },
  {
    name: 'gateway_cache_hits_total',
    type: 'counter',
    help: 'Total number of cache hits (PQ/response)',
    labels: ['cache_type', 'tenant_id']
  },
  {
    name: 'gateway_cache_requests_total',
    type: 'counter',
    help: 'Total number of cache requests (PQ/response)',
    labels: ['cache_type', 'tenant_id']
  },

  // Resource Utilization Metrics
  {
    name: 'intelgraph_active_connections',
    type: 'gauge',
    help: 'Number of active database connections',
    labels: ['database', 'pool_name']
  },
  {
    name: 'intelgraph_memory_usage_bytes',
    type: 'gauge',
    help: 'Memory usage by component',
    labels: ['component', 'type']
  },
  {
    name: 'intelgraph_cpu_usage_ratio',
    type: 'gauge',
    help: 'CPU usage ratio by component',
    labels: ['component']
  },

  // Business Logic Metrics
  {
    name: 'intelgraph_entities_processed_total',
    type: 'counter',
    help: 'Total number of entities processed',
    labels: ['entity_type', 'operation', 'tenant_id']
  },
  {
    name: 'intelgraph_relationships_traversed_total',
    type: 'counter',
    help: 'Total number of relationships traversed in queries',
    labels: ['relationship_type', 'direction', 'tenant_id']
  }
];

/**
 * Metric label definitions and validation
 */
export const METRIC_LABELS = {
  // Request context labels
  tenant_id: {
    description: 'Unique identifier for the tenant making the request',
    required: true,
    validation: /^[a-zA-Z0-9-_]+$/
  },
  user_id: {
    description: 'Unique identifier for the user making the request',
    required: false,
    validation: /^[a-zA-Z0-9-_]+$/
  },

  // NLQ-specific labels
  query_type: {
    description: 'Type of query (search, analysis, exploration, reporting)',
    required: true,
    values: ['search', 'analysis', 'exploration', 'reporting', 'other']
  },
  complexity: {
    description: 'Query complexity level',
    required: true,
    values: ['simple', 'medium', 'complex', 'very_complex']
  },
  model_version: {
    description: 'Version of the NL→Cypher translation model',
    required: true,
    validation: /^v\d+\.\d+\.\d+$/
  },

  // Status and outcome labels
  status: {
    description: 'HTTP status code or operation result',
    required: true,
    validation: /^[1-5]\d{2}$|^(success|error|timeout|blocked)$/
  },
  endpoint: {
    description: 'API endpoint path',
    required: true,
    validation: /^\/[a-zA-Z0-9\/\-_]*$/
  },
  method: {
    description: 'HTTP method',
    required: true,
    values: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },

  // Database-specific labels
  database: {
    description: 'Database instance identifier',
    required: true,
    validation: /^[a-zA-Z0-9-_]+$/
  },

  // Quality and constraint labels
  quality_band: {
    description: 'Quality band for translation scores',
    required: true,
    values: ['excellent', 'good', 'fair', 'poor']
  },
  constraint_type: {
    description: 'Type of constraint that was violated',
    required: true,
    values: ['read_only', 'complexity', 'cost', 'time_limit', 'data_access']
  },
  severity: {
    description: 'Severity level of the event',
    required: true,
    values: ['low', 'medium', 'high', 'critical']
  }
} as const;

/**
 * SLO metric queries for dashboard and alerting
 */
export const SLO_QUERIES = {
  // NLQ Processing SLIs
  nlq_processing_p95: `
    histogram_quantile(0.95,
      rate(intelgraph_nlq_processing_duration_seconds_bucket{job="gateway"}[5m])
    )
  `,
  nlq_processing_p99: `
    histogram_quantile(0.99,
      rate(intelgraph_nlq_processing_duration_seconds_bucket{job="gateway"}[5m])
    )
  `,
  nlq_error_rate: `
    rate(intelgraph_nlq_requests_total{job="gateway",status=~"5.."}[5m]) /
    rate(intelgraph_nlq_requests_total{job="gateway"}[5m])
  `,

  // Cypher Execution SLIs
  cypher_execution_p95: `
    histogram_quantile(0.95,
      rate(intelgraph_cypher_execution_duration_seconds_bucket{job="gateway"}[5m])
    )
  `,
  cypher_execution_p99: `
    histogram_quantile(0.99,
      rate(intelgraph_cypher_execution_duration_seconds_bucket{job="gateway"}[5m])
    )
  `,
  cypher_error_rate: `
    rate(intelgraph_cypher_executions_total{job="gateway",status=~"error|timeout"}[5m]) /
    rate(intelgraph_cypher_executions_total{job="gateway"}[5m])
  `,

  // End-to-End SLIs
  e2e_request_p95: `
    histogram_quantile(0.95,
      rate(intelgraph_request_duration_seconds_bucket{job="gateway",endpoint=~".*nlq.*"}[5m])
    )
  `,
  e2e_request_p99: `
    histogram_quantile(0.99,
      rate(intelgraph_request_duration_seconds_bucket{job="gateway",endpoint=~".*nlq.*"}[5m])
    )
  `,

  // Overall Availability
  gateway_availability: `
    1 - (
      rate(intelgraph_request_duration_seconds_count{job="gateway",status=~"5.."}[10m]) /
      rate(intelgraph_request_duration_seconds_count{job="gateway"}[10m])
    )
  `,

  // Quality Metrics
  nlq_translation_quality: `
    rate(intelgraph_nlq_translation_quality_score_total{job="gateway"}[10m]) /
    rate(intelgraph_nlq_requests_total{job="gateway"}[10m])
  `,

  // Resource Utilization
  database_connection_utilization: `
    intelgraph_active_connections / on(database) group_left()
    (
      max by (database) (intelgraph_database_max_connections)
    )
  `,
  memory_utilization: `
    intelgraph_memory_usage_bytes / on(component) group_left()
    (
      max by (component) (intelgraph_memory_limit_bytes)
    )
  `
} as const;

/**
 * Metric validation utilities
 */
export class MetricValidator {
  static validateLabels(metricName: string, labels: Record<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const metric = GATEWAY_METRICS.find(m => m.name === metricName);

    if (!metric) {
      errors.push(`Unknown metric: ${metricName}`);
      return { valid: false, errors };
    }

    // Check required labels
    if (metric.labels) {
      for (const labelName of metric.labels) {
        const labelDef = METRIC_LABELS[labelName as keyof typeof METRIC_LABELS];
        if (!labelDef) continue;

        if (labelDef.required && !(labelName in labels)) {
          errors.push(`Required label missing: ${labelName}`);
          continue;
        }

        const labelValue = labels[labelName];
        if (labelValue && labelDef.validation && !labelDef.validation.test(labelValue)) {
          errors.push(`Invalid label value for ${labelName}: ${labelValue}`);
        }

        if (labelValue && labelDef.values && !labelDef.values.includes(labelValue)) {
          errors.push(`Invalid label value for ${labelName}: ${labelValue}. Must be one of: ${labelDef.values.join(', ')}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  static getMetricHelp(metricName: string): string {
    const metric = GATEWAY_METRICS.find(m => m.name === metricName);
    return metric?.help || 'No help available for this metric';
  }

  static listMetricsByType(type: 'counter' | 'histogram' | 'gauge' | 'summary'): MetricDefinition[] {
    return GATEWAY_METRICS.filter(m => m.type === type);
  }
}

export default {
  GATEWAY_METRICS,
  METRIC_LABELS,
  SLO_QUERIES,
  MetricValidator
};