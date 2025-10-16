// Grafana dashboard configurations for Maestro Conductor v0.3
export const maestroDashboards = {
  overview: {
    title: 'Maestro Conductor v0.3 - Overview',
    description: 'High-level KPIs and health metrics for the Maestro system',
    panels: [
      {
        title: 'Sprint KPIs',
        type: 'stat',
        targets: [
          {
            expr: 'rate(maestro_tasks_completed_total[24h])',
            legendFormat: 'Tasks/day',
          },
          {
            expr: 'maestro_pr_lead_time_hours{quantile="0.95"}',
            legendFormat: 'PR Lead Time p95 (hrs)',
          },
          {
            expr: 'sum(maestro_llm_cost_usd) / sum(maestro_prs_processed_total)',
            legendFormat: 'LLM Cost/PR ($)',
          },
          {
            expr: 'rate(maestro_pipeline_duration_seconds{quantile="0.95"}[1h]) / 60',
            legendFormat: 'CI Pipeline p95 (min)',
          },
        ],
        thresholds: {
          'Tasks/day': { red: 5, yellow: 8, green: 10 },
          'PR Lead Time p95 (hrs)': { red: 48, yellow: 24, green: 12 },
          'LLM Cost/PR ($)': { red: 15, yellow: 10, green: 7.5 },
          'CI Pipeline p95 (min)': { red: 20, yellow: 15, green: 10 },
        },
      },
      {
        title: 'Task Success Rate',
        type: 'stat',
        targets: [
          {
            expr: '(sum(rate(maestro_tasks_completed_total[1h])) / sum(rate(maestro_tasks_started_total[1h]))) * 100',
            legendFormat: 'Success Rate %',
          },
        ],
        thresholds: {
          'Success Rate %': { red: 70, yellow: 80, green: 90 },
        },
      },
      {
        title: 'Agent Task Distribution',
        type: 'piechart',
        targets: [
          {
            expr: 'sum by (task_kind) (rate(maestro_tasks_completed_total[24h]))',
            legendFormat: '{{task_kind}}',
          },
        ],
      },
    ],
  },

  agents: {
    title: 'Maestro Agents Performance',
    description: 'Detailed metrics for each agent in the orchestrator',
    panels: [
      {
        title: 'Agent Task Duration',
        type: 'heatmap',
        targets: [
          {
            expr: 'sum by (task_kind, le) (maestro_task_duration_seconds_bucket)',
            legendFormat: '{{task_kind}}',
          },
        ],
      },
      {
        title: 'Agent Success Rates by Type',
        type: 'timeseries',
        targets: [
          {
            expr: 'rate(maestro_tasks_completed_total[5m]) by (task_kind)',
            legendFormat: '{{task_kind}} - Completed',
          },
          {
            expr: 'rate(maestro_tasks_failed_total[5m]) by (task_kind)',
            legendFormat: '{{task_kind}} - Failed',
          },
        ],
      },
      {
        title: 'LLM Cost by Agent',
        type: 'timeseries',
        targets: [
          {
            expr: 'sum by (task_kind) (rate(maestro_llm_cost_usd[1h]))',
            legendFormat: '{{task_kind}}',
          },
        ],
      },
      {
        title: 'Queue Metrics',
        type: 'timeseries',
        targets: [
          {
            expr: 'maestro_queue_size',
            legendFormat: 'Queue Size',
          },
          {
            expr: 'maestro_queue_wait_seconds{quantile="0.95"}',
            legendFormat: 'Wait Time p95 (s)',
          },
        ],
      },
    ],
  },

  ci_cd: {
    title: 'CI/CD Performance',
    description: 'Build, test, and deployment metrics',
    panels: [
      {
        title: 'Pipeline Performance',
        type: 'timeseries',
        targets: [
          {
            expr: 'maestro_pipeline_duration_seconds{quantile="0.50"}',
            legendFormat: 'Duration p50',
          },
          {
            expr: 'maestro_pipeline_duration_seconds{quantile="0.95"}',
            legendFormat: 'Duration p95',
          },
        ],
      },
      {
        title: 'Build Cache Performance',
        type: 'stat',
        targets: [
          {
            expr: 'sum(maestro_build_cache_hits_total) / (sum(maestro_build_cache_hits_total) + sum(maestro_build_cache_misses_total)) * 100',
            legendFormat: 'Cache Hit Rate %',
          },
        ],
        thresholds: {
          'Cache Hit Rate %': { red: 60, yellow: 75, green: 85 },
        },
      },
      {
        title: 'Test Results',
        type: 'timeseries',
        targets: [
          {
            expr: 'rate(maestro_tests_passed_total[1h])',
            legendFormat: 'Tests Passed/hr',
          },
          {
            expr: 'rate(maestro_tests_failed_total[1h])',
            legendFormat: 'Tests Failed/hr',
          },
          {
            expr: 'rate(maestro_test_flakes_total[1h])',
            legendFormat: 'Test Flakes/hr',
          },
        ],
      },
      {
        title: 'Test Flake Rate',
        type: 'stat',
        targets: [
          {
            expr: 'sum(rate(maestro_test_flakes_total[24h])) / sum(rate(maestro_tests_run_total[24h])) * 100',
            legendFormat: 'Flake Rate %',
          },
        ],
        thresholds: {
          'Flake Rate %': { red: 5, yellow: 2, green: 1 },
        },
      },
    ],
  },

  security: {
    title: 'Security & Policy',
    description: 'Security scanning and policy enforcement metrics',
    panels: [
      {
        title: 'Security Issues by Severity',
        type: 'timeseries',
        targets: [
          {
            expr: 'sum by (severity) (rate(maestro_security_issues_total[1h]))',
            legendFormat: '{{severity}}',
          },
        ],
      },
      {
        title: 'Policy Violations',
        type: 'timeseries',
        targets: [
          {
            expr: 'sum by (policy) (rate(maestro_policy_violations_total[1h]))',
            legendFormat: '{{policy}}',
          },
        ],
      },
      {
        title: 'Tasks Blocked by Policy',
        type: 'stat',
        targets: [
          {
            expr: 'sum(rate(maestro_policy_blocks_total[24h]))',
            legendFormat: 'Blocks/day',
          },
        ],
      },
      {
        title: 'Vulnerability Trends',
        type: 'timeseries',
        targets: [
          {
            expr: 'sum by (severity) (maestro_vulnerabilities_total)',
            legendFormat: '{{severity}} vulnerabilities',
          },
        ],
      },
    ],
  },

  dora: {
    title: 'DORA Metrics',
    description: 'DevOps Research and Assessment metrics',
    panels: [
      {
        title: 'Deployment Frequency',
        type: 'stat',
        targets: [
          {
            expr: 'sum(rate(maestro_deployments_total[7d])) * 7',
            legendFormat: 'Deploys/week',
          },
        ],
        thresholds: {
          'Deploys/week': { red: 1, yellow: 3, green: 7 },
        },
      },
      {
        title: 'Lead Time for Changes',
        type: 'stat',
        targets: [
          {
            expr: 'maestro_pr_lead_time_hours{quantile="0.50"}',
            legendFormat: 'Lead Time p50 (hrs)',
          },
        ],
        thresholds: {
          'Lead Time p50 (hrs)': { red: 72, yellow: 24, green: 8 },
        },
      },
      {
        title: 'Change Failure Rate',
        type: 'stat',
        targets: [
          {
            expr: 'maestro_change_failure_rate{quantile="0.95"}',
            legendFormat: 'Failure Rate %',
          },
        ],
        thresholds: {
          'Failure Rate %': { red: 30, yellow: 20, green: 10 },
        },
      },
      {
        title: 'Mean Time to Recovery',
        type: 'stat',
        targets: [
          {
            expr: 'maestro_mttr_hours{quantile="0.95"}',
            legendFormat: 'MTTR p95 (hrs)',
          },
        ],
        thresholds: {
          'MTTR p95 (hrs)': { red: 24, yellow: 8, green: 2 },
        },
      },
      {
        title: 'DORA Trends',
        type: 'timeseries',
        targets: [
          {
            expr: 'rate(maestro_deployments_total[1d])',
            legendFormat: 'Deploy Frequency',
          },
          {
            expr: 'maestro_pr_lead_time_hours{quantile="0.50"}',
            legendFormat: 'Lead Time (hrs)',
          },
          {
            expr: 'maestro_change_failure_rate{quantile="0.95"}',
            legendFormat: 'Failure Rate %',
          },
        ],
      },
    ],
  },

  cost: {
    title: 'Cost & Budget Tracking',
    description: 'LLM costs and infrastructure spend',
    panels: [
      {
        title: 'LLM Cost Distribution',
        type: 'piechart',
        targets: [
          {
            expr: 'sum by (task_kind) (maestro_llm_cost_usd)',
            legendFormat: '{{task_kind}}',
          },
        ],
      },
      {
        title: 'Cost Trends',
        type: 'timeseries',
        targets: [
          {
            expr: 'sum(rate(maestro_llm_cost_usd[1h]) * 3600 * 24)',
            legendFormat: 'Daily Cost ($)',
          },
          {
            expr: 'sum(maestro_llm_cost_usd) / sum(maestro_prs_processed_total)',
            legendFormat: 'Cost per PR ($)',
          },
        ],
      },
      {
        title: 'Budget Utilization',
        type: 'gauge',
        targets: [
          {
            expr: 'sum(maestro_llm_cost_usd) / 100 * 100', // Assuming $100/day budget
            legendFormat: 'Budget Used %',
          },
        ],
        thresholds: {
          'Budget Used %': { red: 95, yellow: 80, green: 60 },
        },
      },
      {
        title: 'Token Usage',
        type: 'timeseries',
        targets: [
          {
            expr: 'sum by (task_kind) (rate(maestro_llm_tokens_total[1h]))',
            legendFormat: '{{task_kind}} tokens/hr',
          },
        ],
      },
    ],
  },
};

// Alert rules for Prometheus/Alertmanager
export const alertRules = [
  {
    alert: 'MaestroTaskFailureRateHigh',
    expr: 'sum(rate(maestro_tasks_failed_total[5m])) / sum(rate(maestro_tasks_started_total[5m])) > 0.20',
    for: '2m',
    labels: {
      severity: 'warning',
    },
    annotations: {
      summary: 'High task failure rate in Maestro',
      description:
        '{{ $value | humanizePercentage }} of Maestro tasks are failing',
    },
  },
  {
    alert: 'MaestroQueueBacklog',
    expr: 'maestro_queue_size > 50',
    for: '5m',
    labels: {
      severity: 'warning',
    },
    annotations: {
      summary: 'Maestro queue backlog building up',
      description: 'Queue has {{ $value }} pending tasks',
    },
  },
  {
    alert: 'MaestroLLMCostHigh',
    expr: 'sum(rate(maestro_llm_cost_usd[1h]) * 24) > 100',
    for: '1h',
    labels: {
      severity: 'critical',
    },
    annotations: {
      summary: 'Maestro LLM costs exceeding daily budget',
      description: 'Daily LLM cost projection: ${{ $value | humanize }}',
    },
  },
  {
    alert: 'MaestroPipelineSlow',
    expr: 'maestro_pipeline_duration_seconds{quantile="0.95"} > 1800',
    for: '10m',
    labels: {
      severity: 'warning',
    },
    annotations: {
      summary: 'Maestro CI pipelines running slowly',
      description: 'p95 pipeline duration is {{ $value }}s',
    },
  },
  {
    alert: 'MaestroTestFlakeRateHigh',
    expr: 'sum(rate(maestro_test_flakes_total[1h])) / sum(rate(maestro_tests_run_total[1h])) > 0.05',
    for: '30m',
    labels: {
      severity: 'warning',
    },
    annotations: {
      summary: 'High test flake rate detected',
      description: '{{ $value | humanizePercentage }} of tests are flaking',
    },
  },
  {
    alert: 'MaestroPolicyViolationsHigh',
    expr: 'sum(rate(maestro_policy_violations_total[1h])) > 5',
    for: '15m',
    labels: {
      severity: 'critical',
    },
    annotations: {
      summary: 'High rate of policy violations',
      description: '{{ $value }} policy violations per hour',
    },
  },
];
