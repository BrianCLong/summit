# Summit Observability & CI/CD Enhancements

This bundle wires OpenTelemetry to Prometheus, Grafana, Tempo, and Loki; codifies SLOs and alerts; and delivers a GitHub Actions CI/CD pipeline with canary + rollback simulation.

## Contents
- `otel-collector.yaml` – Collector configuration exporting OTLP signals to Prometheus remote write, Tempo, and Loki.
- `slo-config.yaml` – Service Level Indicators, Objectives, and cost guardrails with 80% burn alerts.
- `alerting-rules.yaml` – Prometheus alert rules feeding PagerDuty and ticket queues.
- `dashboards/*.json` – Grafana dashboards for API, ingest, database, and cost guardrails.
- `helm-values.yaml` – Helm overrides to deploy collector + alert rules via kube-prometheus-stack.
- `terraform-prometheus.tf` – Terraform snippet to manage Prometheus alert rules.
- `../runbooks/*.md` – On-call runbooks aligned with dashboards and alerts.

## Deploy Steps
1. Apply Helm values:
   ```bash
   helm upgrade --install summit-observability grafana/tempo-distributed -f ops/observability/helm-values.yaml
   ```
2. Deploy Terraform snippet:
   ```bash
   terraform init && terraform apply -target=prometheus_alert_rule.cloud_cost_budget
   ```
3. Import dashboards via Grafana API:
   ```bash
   for file in ops/observability/dashboards/*.json; do
     curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" -H "Content-Type: application/json" \
       -X POST "$GRAFANA_URL/api/dashboards/db" -d "{\"dashboard\": $(cat "$file"), \"overwrite\": true}";
   done
   ```
4. Configure CI/CD secret `SIMULATED_FAILURE=false` for production deploys; leave `true` when testing rollback drills.
