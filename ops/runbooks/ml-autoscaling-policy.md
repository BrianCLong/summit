# IntelGraph ML Autoscaling Policy

## Overview
- Purpose: keep GPU-backed inference responsive under bursty traffic.
- Scope: `intelgraph-ml-service` deployment and Helm `ai-service` release values.
- Signals: CPU utilization, DCGM GPU telemetry, Prometheus-derived inference RPS/queue depth.

## Target Metrics & Thresholds
- CPU utilization: scale out when average >70% for 1 minute.
- GPU utilization (`dcgm_gpu_utilization`): maintain 70% ±10% during steady state.
- Inference throughput (`ml_inference_requests_per_second`): sustain <45 RPS per pod.
- Queue depth (`ml_inference_queue_depth`): keep <80 items, alert at 100 for 5 minutes.

## Scaling Behaviour
- Minimum replicas: 3 (GPU warm pool).
- Maximum replicas: 10 (bounded by GPU quota).
- Scale up: double capacity or +4 pods every 60s, stabilization window 60s.
- Scale down: reduce by 50% max every 120s, stabilization window 180s to avoid flapping.

## Helm Configuration
- Chart: `helm/ai-service`.
- Key values:
  - `hpa.metrics[0]`: CPU utilization target (resource metric).
  - `hpa.metrics[1]`: GPU utilization from Prometheus adapter (`dcgm_gpu_utilization`).
  - `hpa.metrics[2]`: Custom Prometheus metric `ml_inference_requests_per_second`.
  - `hpa.behavior`: scale-up/down guard rails (percent + pod policies).
- Override example:
  ```bash
  helm upgrade ml-engine helm/ai-service \
    --set hpa.metrics[1].target.averageValue=80 \
    --set hpa.metrics[2].target.averageValue=35 \
    --set hpa.maxReplicas=12
  ```

## K6 Load Simulation
- Script: `tests/load/ml-inference.k6.js`.
- Command:
  ```bash
  ML_SERVICE_URL=https://ml.prod.summit/api \
  k6 run tests/load/ml-inference.k6.js \
    --tag test_suite=ml-autoscale \
    --vus 50 --duration 15m
  ```
- KPIs: `http_req_duration` p95 < 750ms, error rate <1%, sustained RPS matches HPA target.
- Export JSON: `k6 run ... --out json=ml-autoscale.json` for regression analyzer.

## Chaos Mesh Validations
- Suite: `ops/chaos/experiments.yaml` (`ml_gpu_node_drain`, `ml_pod_failure_under_load`).
- Apply via:
  ```bash
  kubectl apply -f ops/chaos/experiments.yaml
  ```
- Observe Prometheus dashboards for:
  - HPA events (`kubectl describe hpa ml-service-hpa`).
  - Custom metrics: `ml_engine:gpu_utilization:avg`, `ml_engine:inference_queue_depth:avg`.
- Rollback: `kubectl delete -f ops/chaos/experiments.yaml` once validation completes.

## Runbook
1. Baseline traffic with K6 smoke (CI job `test:load:ci`).
2. Execute `test:ml-autoscale` to ramp inference RPS; watch HPA for scale-out.
3. Run Chaos Mesh experiments sequentially; ensure alerts remain green.
4. If backlog persists:
   - Verify Prometheus adapter pods are healthy.
   - Bump `hpa.metrics[2].target.averageValue` downward to trigger faster scale-out.
   - Increase GPU node pool via infrastructure-as-code before raising `maxReplicas`.
5. Document results in ops journal and tag `ml-autoscale` in incident tracker.
