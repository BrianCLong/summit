/**
 * IntelGraph Gateway Observability Module
 *
 * Unified exports for SLO monitoring, alerting, and metrics collection.
 * Provides comprehensive observability for NLQ processing and Cypher execution.
 */

export {
  SLO_THRESHOLDS,
  SLO_ALERT_RULES,
  SLO_PROMETHEUS_RULES,
  SLO_ALERT_ROUTING,
  generateKubernetesConfig
} from './slo-alerts';

export {
  GATEWAY_METRICS,
  METRIC_LABELS,
  SLO_QUERIES,
  MetricValidator
} from './metrics';

export type {
  AlertRule,
  PrometheusGroup,
  PrometheusRule,
  AlertManagerRoute,
  AlertManagerConfig,
  MetricDefinition,
  SLODefinition,
  DashboardPanel,
  GrafanaDashboard
} from './types';

// Re-export commonly used utilities
export const observability = {
  SLO_THRESHOLDS: require('./slo-alerts').SLO_THRESHOLDS,
  GATEWAY_METRICS: require('./metrics').GATEWAY_METRICS,
  MetricValidator: require('./metrics').MetricValidator,
  generateKubernetesConfig: require('./slo-alerts').generateKubernetesConfig
};