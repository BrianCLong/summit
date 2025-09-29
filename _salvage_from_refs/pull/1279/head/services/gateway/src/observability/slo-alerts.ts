/**
 * SLO Alert Definitions for IntelGraph Gateway
 *
 * Defines p95 Service Level Objective alerts for critical operations:
 * - Natural Language Query (NLQ) processing
 * - Cypher execution performance
 * - End-to-end query execution latency
 */

import { PrometheusRule, AlertRule, AlertManagerConfig } from './types';

/**
 * SLO thresholds in milliseconds
 */
export const SLO_THRESHOLDS = {
  // Natural Language Query processing - user-facing interactive queries
  NLQ_P95_MS: 2000,          // 2 seconds for NL→Cypher translation
  NLQ_P99_MS: 5000,          // 5 seconds for worst-case processing

  // Cypher execution - database query performance
  CYPHER_P95_MS: 1500,       // 1.5 seconds for graph queries
  CYPHER_P99_MS: 3000,       // 3 seconds for complex queries

  // End-to-end execution - complete request lifecycle
  E2E_P95_MS: 3000,          // 3 seconds total response time
  E2E_P99_MS: 7000,          // 7 seconds for complex operations

  // Availability and error rate thresholds
  ERROR_RATE_THRESHOLD: 0.05,  // 5% error rate threshold
  AVAILABILITY_THRESHOLD: 0.999, // 99.9% availability SLO
} as const;

/**
 * Prometheus alert rules for NLQ/Execution SLOs
 */
export const SLO_ALERT_RULES: AlertRule[] = [
  // NLQ Processing P95 Latency Alert
  {
    alert: 'NLQProcessingP95High',
    expr: `
      histogram_quantile(0.95,
        rate(intelgraph_nlq_processing_duration_seconds_bucket{job="gateway"}[5m])
      ) * 1000 > ${SLO_THRESHOLDS.NLQ_P95_MS}
    `,
    for: '2m',
    labels: {
      severity: 'warning',
      service: 'gateway',
      slo: 'nlq_processing_p95',
      impact: 'user_experience'
    },
    annotations: {
      summary: 'NLQ processing P95 latency exceeds SLO',
      description: `
        Natural Language Query processing P95 latency is {{ $value }}ms,
        which exceeds the SLO threshold of ${SLO_THRESHOLDS.NLQ_P95_MS}ms.
        This impacts user experience for interactive queries.

        Current P95: {{ $value }}ms
        SLO Target: ${SLO_THRESHOLDS.NLQ_P95_MS}ms
        Instance: {{ $labels.instance }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/nlq-latency',
      dashboard_url: 'https://grafana.intelgraph.io/d/nlq-performance'
    }
  },

  // NLQ Processing P99 Latency Alert (Critical)
  {
    alert: 'NLQProcessingP99Critical',
    expr: `
      histogram_quantile(0.99,
        rate(intelgraph_nlq_processing_duration_seconds_bucket{job="gateway"}[5m])
      ) * 1000 > ${SLO_THRESHOLDS.NLQ_P99_MS}
    `,
    for: '1m',
    labels: {
      severity: 'critical',
      service: 'gateway',
      slo: 'nlq_processing_p99',
      impact: 'user_experience'
    },
    annotations: {
      summary: 'NLQ processing P99 latency critically high',
      description: `
        Natural Language Query processing P99 latency is {{ $value }}ms,
        critically exceeding the threshold of ${SLO_THRESHOLDS.NLQ_P99_MS}ms.
        This severely impacts user experience and may indicate system degradation.

        Current P99: {{ $value }}ms
        Critical Threshold: ${SLO_THRESHOLDS.NLQ_P99_MS}ms
        Instance: {{ $labels.instance }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/nlq-critical-latency',
      dashboard_url: 'https://grafana.intelgraph.io/d/nlq-performance'
    }
  },

  // Cypher Execution P95 Latency Alert
  {
    alert: 'CypherExecutionP95High',
    expr: `
      histogram_quantile(0.95,
        rate(intelgraph_cypher_execution_duration_seconds_bucket{job="gateway"}[5m])
      ) * 1000 > ${SLO_THRESHOLDS.CYPHER_P95_MS}
    `,
    for: '3m',
    labels: {
      severity: 'warning',
      service: 'gateway',
      slo: 'cypher_execution_p95',
      impact: 'query_performance'
    },
    annotations: {
      summary: 'Cypher execution P95 latency exceeds SLO',
      description: `
        Cypher query execution P95 latency is {{ $value }}ms,
        exceeding the SLO threshold of ${SLO_THRESHOLDS.CYPHER_P95_MS}ms.
        This may indicate database performance issues or query complexity problems.

        Current P95: {{ $value }}ms
        SLO Target: ${SLO_THRESHOLDS.CYPHER_P95_MS}ms
        Database: {{ $labels.database }}
        Query Type: {{ $labels.query_type }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/cypher-latency',
      dashboard_url: 'https://grafana.intelgraph.io/d/cypher-performance'
    }
  },

  // Cypher Execution P99 Latency Alert (Critical)
  {
    alert: 'CypherExecutionP99Critical',
    expr: `
      histogram_quantile(0.99,
        rate(intelgraph_cypher_execution_duration_seconds_bucket{job="gateway"}[5m])
      ) * 1000 > ${SLO_THRESHOLDS.CYPHER_P99_MS}
    `,
    for: '1m',
    labels: {
      severity: 'critical',
      service: 'gateway',
      slo: 'cypher_execution_p99',
      impact: 'query_performance'
    },
    annotations: {
      summary: 'Cypher execution P99 latency critically high',
      description: `
        Cypher query execution P99 latency is {{ $value }}ms,
        critically exceeding the threshold of ${SLO_THRESHOLDS.CYPHER_P99_MS}ms.
        This indicates severe database performance degradation.

        Current P99: {{ $value }}ms
        Critical Threshold: ${SLO_THRESHOLDS.CYPHER_P99_MS}ms
        Database: {{ $labels.database }}
        Query Type: {{ $labels.query_type }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/cypher-critical-latency',
      dashboard_url: 'https://grafana.intelgraph.io/d/cypher-performance'
    }
  },

  // End-to-End Request P95 Latency Alert
  {
    alert: 'E2ERequestP95High',
    expr: `
      histogram_quantile(0.95,
        rate(intelgraph_request_duration_seconds_bucket{job="gateway",endpoint=~".*nlq.*"}[5m])
      ) * 1000 > ${SLO_THRESHOLDS.E2E_P95_MS}
    `,
    for: '2m',
    labels: {
      severity: 'warning',
      service: 'gateway',
      slo: 'e2e_request_p95',
      impact: 'user_experience'
    },
    annotations: {
      summary: 'End-to-end request P95 latency exceeds SLO',
      description: `
        End-to-end request P95 latency is {{ $value }}ms,
        exceeding the SLO threshold of ${SLO_THRESHOLDS.E2E_P95_MS}ms.
        This impacts overall user experience for NLQ operations.

        Current P95: {{ $value }}ms
        SLO Target: ${SLO_THRESHOLDS.E2E_P95_MS}ms
        Endpoint: {{ $labels.endpoint }}
        Method: {{ $labels.method }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/e2e-latency',
      dashboard_url: 'https://grafana.intelgraph.io/d/e2e-performance'
    }
  },

  // NLQ Error Rate Alert
  {
    alert: 'NLQErrorRateHigh',
    expr: `
      (
        rate(intelgraph_nlq_requests_total{job="gateway",status=~"5.."}[5m]) /
        rate(intelgraph_nlq_requests_total{job="gateway"}[5m])
      ) > ${SLO_THRESHOLDS.ERROR_RATE_THRESHOLD}
    `,
    for: '2m',
    labels: {
      severity: 'warning',
      service: 'gateway',
      slo: 'nlq_error_rate',
      impact: 'availability'
    },
    annotations: {
      summary: 'NLQ error rate exceeds SLO threshold',
      description: `
        Natural Language Query error rate is {{ $value | humanizePercentage }},
        exceeding the SLO threshold of ${(SLO_THRESHOLDS.ERROR_RATE_THRESHOLD * 100).toFixed(1)}%.
        This indicates issues with NLQ processing or translation quality.

        Current Error Rate: {{ $value | humanizePercentage }}
        SLO Threshold: ${(SLO_THRESHOLDS.ERROR_RATE_THRESHOLD * 100).toFixed(1)}%
        Instance: {{ $labels.instance }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/nlq-errors',
      dashboard_url: 'https://grafana.intelgraph.io/d/nlq-errors'
    }
  },

  // Cypher Execution Error Rate Alert
  {
    alert: 'CypherExecutionErrorRateHigh',
    expr: `
      (
        rate(intelgraph_cypher_executions_total{job="gateway",status=~"error|timeout"}[5m]) /
        rate(intelgraph_cypher_executions_total{job="gateway"}[5m])
      ) > ${SLO_THRESHOLDS.ERROR_RATE_THRESHOLD}
    `,
    for: '3m',
    labels: {
      severity: 'warning',
      service: 'gateway',
      slo: 'cypher_error_rate',
      impact: 'availability'
    },
    annotations: {
      summary: 'Cypher execution error rate exceeds SLO threshold',
      description: `
        Cypher execution error rate is {{ $value | humanizePercentage }},
        exceeding the SLO threshold of ${(SLO_THRESHOLDS.ERROR_RATE_THRESHOLD * 100).toFixed(1)}%.
        This may indicate database connectivity issues or query problems.

        Current Error Rate: {{ $value | humanizePercentage }}
        SLO Threshold: ${(SLO_THRESHOLDS.ERROR_RATE_THRESHOLD * 100).toFixed(1)}%
        Database: {{ $labels.database }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/cypher-errors',
      dashboard_url: 'https://grafana.intelgraph.io/d/cypher-errors'
    }
  },

  // Overall Gateway Availability Alert
  {
    alert: 'GatewayAvailabilityLow',
    expr: `
      (
        1 - (
          rate(intelgraph_request_duration_seconds_count{job="gateway",status=~"5.."}[10m]) /
          rate(intelgraph_request_duration_seconds_count{job="gateway"}[10m])
        )
      ) < ${SLO_THRESHOLDS.AVAILABILITY_THRESHOLD}
    `,
    for: '5m',
    labels: {
      severity: 'critical',
      service: 'gateway',
      slo: 'availability',
      impact: 'service_availability'
    },
    annotations: {
      summary: 'Gateway availability below SLO threshold',
      description: `
        Gateway service availability is {{ $value | humanizePercentage }},
        below the SLO threshold of ${(SLO_THRESHOLDS.AVAILABILITY_THRESHOLD * 100).toFixed(1)}%.
        This indicates a service-wide availability issue requiring immediate attention.

        Current Availability: {{ $value | humanizePercentage }}
        SLO Target: ${(SLO_THRESHOLDS.AVAILABILITY_THRESHOLD * 100).toFixed(1)}%
        Instance: {{ $labels.instance }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/gateway-availability',
      dashboard_url: 'https://grafana.intelgraph.io/d/gateway-availability'
    }
  },

  // NLQ Translation Quality Alert
  {
    alert: 'NLQTranslationQualityLow',
    expr: `
      (
        rate(intelgraph_nlq_translation_quality_score_total{job="gateway"}[10m]) /
        rate(intelgraph_nlq_requests_total{job="gateway"}[10m])
      ) < 0.85
    `,
    for: '5m',
    labels: {
      severity: 'warning',
      service: 'gateway',
      slo: 'nlq_quality',
      impact: 'query_accuracy'
    },
    annotations: {
      summary: 'NLQ translation quality score below threshold',
      description: `
        Natural Language Query translation quality score is {{ $value | humanizePercentage }},
        below the threshold of 85%. This may indicate issues with the NL→Cypher
        translation model or degraded query understanding.

        Current Quality Score: {{ $value | humanizePercentage }}
        Quality Threshold: 85%
        Instance: {{ $labels.instance }}
      `,
      runbook_url: 'https://docs.intelgraph.io/runbooks/nlq-quality',
      dashboard_url: 'https://grafana.intelgraph.io/d/nlq-quality'
    }
  }
];

/**
 * Prometheus rules configuration for SLO monitoring
 */
export const SLO_PROMETHEUS_RULES: PrometheusRule = {
  groups: [
    {
      name: 'intelgraph-gateway-slo',
      interval: '30s',
      rules: SLO_ALERT_RULES
    },
    {
      name: 'intelgraph-gateway-slo-recording',
      interval: '30s',
      rules: [
        // Recording rules for SLO dashboards and analysis
        {
          record: 'intelgraph:nlq_processing_p95',
          expr: `
            histogram_quantile(0.95,
              rate(intelgraph_nlq_processing_duration_seconds_bucket{job="gateway"}[5m])
            )
          `
        },
        {
          record: 'intelgraph:nlq_processing_p99',
          expr: `
            histogram_quantile(0.99,
              rate(intelgraph_nlq_processing_duration_seconds_bucket{job="gateway"}[5m])
            )
          `
        },
        {
          record: 'intelgraph:cypher_execution_p95',
          expr: `
            histogram_quantile(0.95,
              rate(intelgraph_cypher_execution_duration_seconds_bucket{job="gateway"}[5m])
            )
          `
        },
        {
          record: 'intelgraph:cypher_execution_p99',
          expr: `
            histogram_quantile(0.99,
              rate(intelgraph_cypher_execution_duration_seconds_bucket{job="gateway"}[5m])
            )
          `
        },
        {
          record: 'intelgraph:e2e_request_p95',
          expr: `
            histogram_quantile(0.95,
              rate(intelgraph_request_duration_seconds_bucket{job="gateway",endpoint=~".*nlq.*"}[5m])
            )
          `
        },
        {
          record: 'intelgraph:nlq_error_rate',
          expr: `
            rate(intelgraph_nlq_requests_total{job="gateway",status=~"5.."}[5m]) /
            rate(intelgraph_nlq_requests_total{job="gateway"}[5m])
          `
        },
        {
          record: 'intelgraph:cypher_error_rate',
          expr: `
            rate(intelgraph_cypher_executions_total{job="gateway",status=~"error|timeout"}[5m]) /
            rate(intelgraph_cypher_executions_total{job="gateway"}[5m])
          `
        },
        {
          record: 'intelgraph:gateway_availability',
          expr: `
            1 - (
              rate(intelgraph_request_duration_seconds_count{job="gateway",status=~"5.."}[10m]) /
              rate(intelgraph_request_duration_seconds_count{job="gateway"}[10m])
            )
          `
        }
      ]
    }
  ]
};

/**
 * Alert routing and notification configuration
 */
export const SLO_ALERT_ROUTING: AlertManagerConfig = {
  route: {
    group_by: ['alertname', 'service', 'severity'],
    group_wait: '10s',
    group_interval: '5m',
    repeat_interval: '12h',
    receiver: 'default',
    routes: [
      {
        matchers: [
          'service = "gateway"',
          'severity = "critical"'
        ],
        receiver: 'critical-alerts',
        group_wait: '5s',
        repeat_interval: '5m',
        continue: true
      },
      {
        matchers: [
          'service = "gateway"',
          'slo =~ ".*_p95|.*_p99"'
        ],
        receiver: 'slo-alerts',
        group_interval: '2m'
      },
      {
        matchers: [
          'impact = "user_experience"'
        ],
        receiver: 'user-experience-alerts'
      }
    ]
  },
  receivers: [
    {
      name: 'default',
      webhook_configs: [
        {
          url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
          send_resolved: true,
          title: 'IntelGraph Gateway Alert',
          text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        }
      ]
    },
    {
      name: 'critical-alerts',
      pagerduty_configs: [
        {
          routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY',
          description: 'Critical alert: {{ .GroupLabels.alertname }}',
          details: {
            summary: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}',
            source: 'IntelGraph Gateway Monitoring'
          }
        }
      ],
      webhook_configs: [
        {
          url: 'https://hooks.slack.com/services/T00000000/B00000000/CRITICAL_CHANNEL_WEBHOOK',
          send_resolved: true,
          title: '🚨 CRITICAL: IntelGraph Gateway',
          text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        }
      ]
    },
    {
      name: 'slo-alerts',
      webhook_configs: [
        {
          url: 'https://hooks.slack.com/services/T00000000/B00000000/SLO_CHANNEL_WEBHOOK',
          send_resolved: true,
          title: '📊 SLO Alert: IntelGraph Gateway',
          text: '{{ range .Alerts }}{{ .Annotations.summary }}\nRunbook: {{ .Annotations.runbook_url }}{{ end }}'
        }
      ]
    },
    {
      name: 'user-experience-alerts',
      webhook_configs: [
        {
          url: 'https://hooks.slack.com/services/T00000000/B00000000/UX_TEAM_WEBHOOK',
          send_resolved: true,
          title: '👥 User Experience Impact: IntelGraph Gateway',
          text: '{{ range .Alerts }}{{ .Annotations.summary }}\nDashboard: {{ .Annotations.dashboard_url }}{{ end }}'
        }
      ]
    }
  ]
};

/**
 * Export configuration for Kubernetes deployment
 */
export function generateKubernetesConfig(): string {
  return `
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: intelgraph-gateway-slo-alerts
  namespace: intelgraph
  labels:
    app: intelgraph-gateway
    component: monitoring
    team: platform
spec:
  groups:
${SLO_PROMETHEUS_RULES.groups.map(group => `
  - name: ${group.name}
    interval: ${group.interval}
    rules:
${group.rules.map(rule => {
  if ('alert' in rule) {
    return `    - alert: ${rule.alert}
      expr: |
        ${rule.expr.trim()}
      for: ${rule.for}
      labels:
${Object.entries(rule.labels).map(([k, v]) => `        ${k}: "${v}"`).join('\n')}
      annotations:
${Object.entries(rule.annotations).map(([k, v]) => `        ${k}: |-
          ${v.toString().trim()}`).join('\n')}`;
  } else {
    return `    - record: ${rule.record}
      expr: |
        ${rule.expr.trim()}`;
  }
}).join('\n')}
`).join('')}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: intelgraph
data:
  alertmanager.yml: |
${JSON.stringify(SLO_ALERT_ROUTING, null, 4).split('\n').map(line => `    ${line}`).join('\n')}
`;
}

export default {
  SLO_THRESHOLDS,
  SLO_ALERT_RULES,
  SLO_PROMETHEUS_RULES,
  SLO_ALERT_ROUTING,
  generateKubernetesConfig
};