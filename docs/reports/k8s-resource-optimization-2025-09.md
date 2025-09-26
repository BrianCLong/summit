# Kubernetes Resource Optimization Report — 2025-09-23

## Prometheus workload profile

| Workload | CPU avg / p95 / max (mcores) | Memory avg / p95 / max (MiB) | Notes |
| --- | --- | --- | --- |
| server (Node.js) | 230 / 380 / 510 | 420 / 610 / 720 | P95 latency stayed at 185 ms across the window. |
| worker-python | 160 / 270 / 360 | 310 / 520 / 660 | Kafka consumer lag p95 = 42 messages. |
| postgres | 150 / 240 / 340 | 1,650 / 2,140 / 2,490 | Peak disk IO 280 ops/s without throttling. |

_All metrics pulled from 24 h of Prometheus samples ending 2025-09-23 04:00 UTC.【F:monitoring/reports/prometheus-resource-usage-2025-09-23.json†L1-L44】_

## Updated resource envelopes

| Workload | Requests (CPU / Memory) | Limits (CPU / Memory) | Previous Requests | Previous Limits |
| --- | --- | --- | --- | --- |
| server | 400m / 512Mi | 900m / 1Gi | 200m / 256Mi | 1,000m / 1Gi |
| worker-python | 200m / 384Mi | 600m / 768Mi | 100m / 128Mi | 1,000m / 512Mi |
| postgres | 250m / 2Gi | 600m / 3Gi | 100m / 256Mi | 500m / 1Gi |

- Node.js API chart updated to right-size requests and limits, reducing headroom while keeping ≥1.7× p95 buffers.【F:helm/server/values.yaml†L42-L58】
- Python worker values now come from `values.yaml` and cap CPU at 600m, preventing noisy-neighbour throttling while leaving 2× CPU burst capacity.【F:helm/worker-python/values.yaml†L5-L38】【F:helm/worker-python/templates/deployment.yaml†L18-L23】
- Postgres now reserves 2 GiB and can grow to 3 GiB, matching the 2.1 GiB memory p95 we observed in Prometheus.【F:helm/postgres/values.yaml†L11-L36】

## Vertical Pod Autoscaler rollout

- Each chart now ships an opt-in VPA manifest with `updatePolicy: Auto` so pods track organic growth without manual redeploys.【F:helm/server/templates/vpa.yaml†L1-L25】【F:helm/worker-python/templates/vpa.yaml†L1-L25】【F:helm/postgres/templates/vpa.yaml†L1-L25】
- Default guardrails limit CPU to 1.5 cores for the API, 1 core for workers, and 2 cores for Postgres while ensuring memory cannot shrink below historical safe baselines.【F:helm/server/values.yaml†L60-L68】【F:helm/worker-python/values.yaml†L40-L48】【F:helm/postgres/values.yaml†L38-L46】

## Chaos Mesh validation

- Applied `k8s/chaos/api-resource-stress.yaml` to spike API CPU (85% load) and 300 MiB of temporary heap pressure for 10 minutes.【F:k8s/chaos/api-resource-stress.yaml†L1-L18】
- Prometheus indicated zero pod restarts and kept server CPU <75% of the new limit, validating the tighter envelopes.【F:monitoring/reports/prometheus-resource-usage-2025-09-23.json†L45-L61】

## Follow-up

1. Roll the VPA CRDs into lower environments first; confirm recommendation history before enabling `Auto` in production.
2. Add matching HPAs for worker-python throughput once Kafka lag baseline settles with the new sizing.
3. Re-run the stress scenario monthly and append results to this report folder for trend tracking.
