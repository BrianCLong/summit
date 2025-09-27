/**
 * TypeScript types for observability and SLO monitoring infrastructure
 */

export interface AlertRule {
  alert?: string;
  record?: string;
  expr: string;
  for?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface PrometheusGroup {
  name: string;
  interval: string;
  rules: AlertRule[];
}

export interface PrometheusRule {
  groups: PrometheusGroup[];
}

export interface AlertManagerRoute {
  matchers?: string[];
  receiver: string;
  group_by?: string[];
  group_wait?: string;
  group_interval?: string;
  repeat_interval?: string;
  continue?: boolean;
  routes?: AlertManagerRoute[];
}

export interface WebhookConfig {
  url: string;
  send_resolved?: boolean;
  title?: string;
  text?: string;
  http_config?: {
    basic_auth?: {
      username: string;
      password: string;
    };
    bearer_token?: string;
  };
}

export interface PagerDutyConfig {
  routing_key: string;
  description: string;
  details?: Record<string, string>;
  severity?: 'critical' | 'error' | 'warning' | 'info';
}

export interface AlertManagerReceiver {
  name: string;
  webhook_configs?: WebhookConfig[];
  pagerduty_configs?: PagerDutyConfig[];
  email_configs?: Array<{
    to: string;
    from: string;
    subject: string;
    body: string;
  }>;
}

export interface AlertManagerConfig {
  route: AlertManagerRoute;
  receivers: AlertManagerReceiver[];
  inhibit_rules?: Array<{
    source_matchers: string[];
    target_matchers: string[];
    equal?: string[];
  }>;
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'histogram' | 'gauge' | 'summary';
  help: string;
  labels?: string[];
  buckets?: number[];
}

export interface SLODefinition {
  name: string;
  description: string;
  sli_metric: string;
  threshold: number;
  window: string;
  target_availability: number;
  severity: 'critical' | 'warning' | 'info';
}

export interface DashboardPanel {
  id: number;
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'heatmap';
  targets: Array<{
    expr: string;
    legendFormat: string;
    refId: string;
  }>;
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  yAxes?: Array<{
    label: string;
    unit: string;
    min?: number;
    max?: number;
  }>;
  thresholds?: Array<{
    value: number;
    color: string;
    op: 'gt' | 'lt';
  }>;
}

export interface GrafanaDashboard {
  id?: number;
  title: string;
  description: string;
  tags: string[];
  timezone: string;
  refresh: string;
  time: {
    from: string;
    to: string;
  };
  panels: DashboardPanel[];
  templating: {
    list: Array<{
      name: string;
      type: 'query' | 'custom' | 'interval';
      query?: string;
      options?: Array<{
        text: string;
        value: string;
      }>;
    }>;
  };
}