# Observability Artifact Inventory (PR #15382)

This inventory captures the observability assets introduced in the branch for PR #15382, describing what each file is for and where it should be applied.

## Prometheus Alert and Rule Files

| File | Purpose | Deploy Location |
| --- | --- | --- |
| `monitoring/alert_rules.yml` | Core IntelGraph service health alerts (availability, latency, CPU/memory, DB connectivity, AI queue backlog). | Loaded into the primary Prometheus rule configuration. |
| `monitoring/alerts.yaml` | General platform alerts for request/graph latency, storage pressure, and ingestion lags. | Prometheus alerting rules. |
| `monitoring/alerts-production.yml` | Production-tuned alerts for API saturation, Redis/Neo4j health, and data pipeline backlogs. | Prometheus in production environments. |
| `monitoring/alerts-federal.yaml` | FedRAMP/FIPS-focused alerts (PKI, WORM, tamper detection). | Prometheus for regulated/federal deployments. |
| `monitoring/summit-alerts.yml` | Summit experience and UX signals (golden-path failures, UI error rate). | Prometheus rules for Summit UI monitoring. |
| `monitoring/canary-budget-alerts.yml` | Canary and error-budget alerting for rollout guardrails. | Prometheus alert rules attached to canary namespaces. |
| `monitoring/alerts/production-alerts.yaml` | Service-level production alerts specific to Maestro/worker nodes. | Prometheus rule group for Maestro/worker clusters. |
| `monitoring/alerts/maestro-rules.yaml` | Maestro workflow SLA/throughput alerts. | Prometheus rules consumed by Maestro Prometheus instance. |
| `monitoring/prometheus/alerts-conductor.yml` | Conductor orchestration alerts (scheduler lag, queue depth). | Prometheus rule file for Conductor instances. |
| `monitoring/prometheus/burn-alerts.rules.yml` | Error budget burn-rate policies. | Prometheus rule file for SLO enforcement. |
| `monitoring/prometheus/error-budget-rules.yml` | SLO error budget thresholds and slow-burn detection. | Prometheus rule file for SLO enforcement. |
| `monitoring/prometheus/maestro-alerts.yaml` | Maestro-specific availability/throughput alerts. | Prometheus rule file for Maestro. |
| `monitoring/rules/slo_rules.yml` | Generic SLO calculations used across dashboards and alerts. | Prometheus recording/alerting rules. |

## Grafana Dashboards

Unless otherwise noted, dashboards are imported into Grafana from the listed JSON definitions.

- **Platform & Ops**
  - `monitoring/grafana-dashboard.json`: IntelGraph platform production overview dashboard.
  - `monitoring/grafana-server-dashboard.json`: Server health, latency, and capacity overview.
  - `monitoring/dashboards/intelgraph-platform.json`: Core platform SLI/SLO rollups.
  - `monitoring/dashboards/service_health.json`: Service health summary by dependency.
  - `monitoring/dashboards/metrics-overview.json`: Cross-service metrics overview.
  - `monitoring/dashboards/v2.0-production-health.json`: Production health v2 baseline.
  - `monitoring/dashboards/maestro-production-dashboard.json`: Maestro production telemetry.
  - `monitoring/dashboards/tenant-overview.json`: Tenant-level health and usage.
  - `monitoring/dashboards/marketplace_sla.json`: Marketplace SLA compliance.
  - `monitoring/dashboards/observability.json`: Consolidated observability overview.

- **SLO / Reliability**
  - `monitoring/dashboards/slo-sla-dashboard.json`: SLO/SLA tracking dashboard.
  - `monitoring/dashboards/golden-path-sli.json`: Golden path SLI tracking.
  - `monitoring/dashboards/ga-slo.json`: GA readiness SLOs.
  - `monitoring/dashboards/ga-core-go-no-go.json`: GA go/no-go reliability signals.
  - `monitoring/dashboards/agent-interventions.json`: Agent intervention/error signals.
  - `monitoring/dashboards/pr-velocity.json`: PR throughput/reliability cadence.
  - `monitoring/dashboards/metrics-overview.json`: SLI aggregate metrics (shared with ops view).

- **Security & Risk**
  - `monitoring/dashboards/security-overview.json`: Security control posture.
  - `monitoring/dashboards/risk_overview.json`: Risk posture and drift.
  - `monitoring/dashboards/risk_drift.json`: Risk drift detection.
  - `monitoring/dashboards/deception-scores.json`: Deception score monitoring.

- **Experience & Feedback**
  - `monitoring/dashboards/user-feedback-dashboard.json`: User feedback signals.
  - `monitoring/collab-latency-dashboard.json`: Collaboration latency metrics.

- **Cost / FinOps**
  - `monitoring/dashboards/cost-performance.json`: Cost vs. performance KPIs.
  - `monitoring/grafana/finops-dashboard.json`: FinOps efficiency dashboard.
  - `monitoring/cloud-dashboards/cost-dashboard.json`: Cloud cost overview.

- **Data / Graph / Infra Specific**
  - `monitoring/grafana/neo4j-health.json`: Neo4j health dashboard.
  - `monitoring/grafana/dashboards/graphql-slo.json`: GraphQL latency and error SLOs.
  - `monitoring/grafana/dashboards/compliance-dashboard.json`: Compliance KPIs.
  - `monitoring/grafana/dashboards/threat-detection-dashboard.json`: Threat detection visibility.
  - `monitoring/grafana/dashboards/summit-overview.json`: Summit-specific rollup.
  - `monitoring/grafana/dashboards/mc-platform-v0.4.5-golden.json`: Multi-cloud platform health.
  - `monitoring/grafana/dashboards/maestro.json`: Maestro workload dashboard.
  - `monitoring/grafana/dashboards/production-slo-dashboard.json`: Production SLOs.
  - `monitoring/grafana/dashboards/sprint25_ga_core.json`: GA core sprint dashboard.
  - `monitoring/grafana/dashboards/sprint25_guardrails.json`: Guardrail adherence.
  - `monitoring/cloud-dashboards/grafana-multi-cloud.json`: Multi-cloud monitoring view.
  - `monitoring/conductor-dashboards.json`: Conductor orchestration insights.

## Supporting Monitoring Configurations

- `monitoring/prometheus.yml`, `monitoring/prometheus/prometheus.yml`: Prometheus server configuration for scraping targets and rule loading.
- `monitoring/alertmanager.yml` and `monitoring/alertmanager/alertmanager.yml`: Alertmanager configuration and routing.
- `monitoring/otel/collector-config.yml`: OTEL collector config for metrics/logs/trace ingestion.
- `monitoring/docker-compose.monitoring.yml`: Local monitoring stack compose file.
- `monitoring/promql-panels.yml`: PromQL snippets for dashboards/panels.
- `monitoring/logs/promtail-config.yml`: Promtail configuration for log shipping.
- `monitoring/oncall-config.yml`: On-call routing for alerts.

## Existing Documentation and Workflow Touchpoints

- `monitoring/README.md` documents the monitoring stack architecture and quick start for Prometheus, Grafana, and Alertmanager.
- No existing CI workflow currently validates these observability artifacts; validation is added as part of this hardening.
