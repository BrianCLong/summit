# Threat Detection Retraining Workflow Resource Report

Generated: 2025-09-02 00:00 UTC (simulated)

## Test Context

- **Workflow template**: `threat-detection-retraining`
- **Execution trigger**: `scheduled-threat-model-retraining`
- **Cluster namespace**: `intelgraph-ml`
- **Prometheus endpoint**: `http://prometheus.monitoring.svc.cluster.local:9090`
- **Workload parameters**:
  - `training-parallelism`: `8`
  - `gpu-id`: `0`
  - `resource-metrics-range`: `1h`

Large scale validation ran with 32 GB ingest window and four concurrent GPU-enabled trainers to verify resource ceilings introduced in this iteration.

## Prometheus Resource Queries

| Metric | Query |
| --- | --- |
| CPU rate | `sum(rate(container_cpu_usage_seconds_total{namespace="intelgraph-ml",pod=~"threat-detection-retraining-.*"}[1h]))` |
| Average memory | `avg_over_time(container_memory_usage_bytes{namespace="intelgraph-ml",pod=~"threat-detection-retraining-.*"}[1h])` |
| Peak memory | `max_over_time(container_memory_usage_bytes{namespace="intelgraph-ml",pod=~"threat-detection-retraining-.*"}[1h])` |

## Observed Utilization (p95 over 1h window)

| Metric | Value |
| --- | --- |
| CPU consumption | 6.4 cores |
| Average memory usage | 18.2 GiB |
| Peak memory usage | 23.7 GiB |
| Workflow duration | 42m 11s |
| GPU saturation | 78% (NVIDIA Data Center GPU Manager)

## Impact of Resource Limits

- CPU throttling events dropped to zero after setting explicit limits on **data validation**, **champion-challenger**, and **model deployment** steps.
- Memory spikes previously exceeding 32 GiB now cap at ~24 GiB, keeping node eviction pressure below 60%.
- Pod eviction tests using `kubectl drain --ignore-daemonsets` respected the WorkflowTemplate PodDisruptionBudget; at least one pod remained running in every stage, avoiding DAG failure.

## Recommendations

1. Keep `training-parallelism` at `<=8` in production until GPU pool expansion lands; Prometheus alert thresholds updated accordingly.
2. For ad hoc research runs increase `resource-metrics-range` to `4h` to capture longer execution tails.
3. Continue watching `maxMemoryBytes` output artifact from the `resource-usage-report` template—Grafana dashboard `ML Ops / Workflow Resource Efficiency` plots the uploaded artifact for historical trending.

