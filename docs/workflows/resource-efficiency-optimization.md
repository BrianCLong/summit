# Argo Workflow Resource Efficiency Playbook

This playbook captures the hardening work completed in Workstream 127 to keep Summit's Argo Workflows efficient and resilient under heavy load.

## 1. Resource Policies Embedded in Workflow Templates

- **Parameterized parallelism** – `training-parallelism` drives `parallel-model-training.parallelism`, enabling high-volume test runs without editing the template. Default is `4`, large-scale cron runs pin to `8`.
- **Step-level resource envelopes** – new CPU/memory requests and limits protect `data validation`, `champion/challenger testing`, `model deployment`, `monitoring bootstrap`, and the Prometheus reporting step. GPU-enabled training continues to reserve `1` NVIDIA device per replica.
- **Workflow metrics emission** – Prometheus gauges `workflow_cpu_seconds_total` and `workflow_memory_mebibytes` are emitted when a workflow completes, using Argo's `resourcesDuration` telemetry for quick trend dashboards.
- **Automated resource report** – the `resource-usage-report` `onExit` template queries Prometheus and publishes `workflow-resource-report` artifacts summarizing CPU, average memory, and peak memory.

## 2. Pod Disruption Budget Strategy

- `podDisruptionBudget.minAvailable: 1` on the WorkflowTemplate keeps at least one pod for each stage during voluntary disruptions.
- Helm chart now renders a matching `policy/v1` PodDisruptionBudget (`<release>-pdb`) for the workflow services so drain operations and cluster upgrades do not evict every worker simultaneously.
- Validation flow:
  1. `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data`.
  2. Confirm `kubectl get pdb` shows `Allowed disruptions` stuck at `0` until replacement pods start.
  3. Observe workflow DAG stays in `Running` state rather than `Error`.

## 3. Prometheus Integration

- ServiceMonitor is rendered by Helm (enabled by default) targeting the workflow service on the `http` port with a `30s` interval and `10s` timeout.
- Workflow metrics rely on Prometheus scraping `kube-state-metrics`/`cAdvisor`; no sidecars required. Labels `workflows.argoproj.io/workflow` let you filter per execution.
- Artifact output from `resource-usage-report` is ingested by the `ML Ops / Workflow Resource Efficiency` Grafana dashboard (datasource: Loki for logs, Prometheus for metrics, and S3 artifact bucket for JSON uploads).
- Alerting hooks: extend the existing PrometheusRule `mlops-workflow-cost` with thresholds (CPU > 8 cores for 15m, maxMemory > 28 GiB) referencing the exported gauges.

## 4. Large-Scale Test Procedure

1. Submit an ad hoc run overriding the cron defaults:
   ```bash
   argo submit ml-pipeline/auto-retraining-mlops.yaml \
     -n intelgraph-ml \
     -p current-model=threat-detection-v1.0.0 \
     -p gpu-id=0 \
     -p training-parallelism=8 \
     -p resource-metrics-range=1h \
     --watch
   ```
2. After completion, download the artifact:
   ```bash
   argo get @latest -n intelgraph-ml --artifact workflow-resource-report
   ```
3. Validate Prometheus gauges:
   ```bash
   promtool query instant http://prometheus.monitoring.svc.cluster.local:9090 \
     'workflow_cpu_seconds_total{workflow="<name>"}'
   ```
4. Attempt a voluntary disruption while a run is active to ensure the PDB blocks eviction.

## 5. Operational Checklist

- [ ] Confirm `ServiceMonitor` registered in the Prometheus Operator namespace.
- [ ] Ensure Grafana dashboard `ML Ops / Workflow Resource Efficiency` loads new panels (CPU, avg/max memory, duration).
- [ ] Rotate helm values if you need to disable ServiceMonitor or adjust scrape intervals for staging.
- [ ] Review the resource report Markdown in `workflows/reports/` after each load test to spot regressions.

## 6. References

- `ml-pipeline/auto-retraining-mlops.yaml` – optimized WorkflowTemplate & CronWorkflow.
- `summit_helm_argocd_multiacct_pack/helm/summit` – Helm values, PodDisruptionBudget, and ServiceMonitor templates.
- `workflows/reports/threat-detection-retraining-resource-report.md` – latest large-scale execution summary.

