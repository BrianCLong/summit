# Agent Queue Autoscaling with Cost & Latency SLOs

This playbook documents how to drive adaptive scaling for agent workload queues using the `@graphai/cost-guard` package. It pairs real-time latency and cost telemetry with KEDA-based scaling so we can hold SLOs while protecting spend.

## Metrics-driven policy

- **Primary SLO metric:** `agent_queue_slo_pressure{queue="<name>"}` represents the dominant normalized pressure across p95 latency and backlog targets.
- **Cost guardrail metric:** `agent_queue_cost_pressure{queue="<name>"}` captures minute-over-minute spend pressure relative to budget.
- **Telemetry hints:** Each scaling decision surfaces `sloBurnRate`, `costBurnRate`, `adaptiveScaleStep`, and alert queries for fast/slow burn and cost anomalies.

## Generating KEDA objects

Use `ResourceOptimizationEngine.recommendQueueAutoscaling` to derive the scaling decision, then feed it into `buildKedaScaledObject(queueName, deploymentName, namespace, decision, slo)`.

```ts
const engine = new ResourceOptimizationEngine();
const decision = engine.recommendQueueAutoscaling(currentReplicas, runtimeSignals);
const scaledObject = engine.buildKedaScaledObject(
  runtimeSignals.queueName,
  "agent-worker",
  "workloads",
  decision
);
```

Key behaviors:

- **Prometheus triggers** for both SLO burn and cost burn to avoid runaway spend.
- **Adaptive HPA behavior** aligns scale steps with observed burn rate while respecting `minReplicas`, `maxReplicas`, and cooldowns.
- **Fallback** keeps at least the minimum replicas if Prometheus is unavailable.

## Dashboard and alert wiring

- Drop the alert queries from `decision.alerts` into Grafana or Alertmanager to page on:
  - Fast burn: `agent_queue_slo_pressure` over 5m exceeding the latency burn threshold.
  - Slow burn: 30m burn crossing 75% of the threshold (early warning).
  - Cost anomaly: `agent_queue_cost_pressure` above the cost burn threshold while latency/backlog are healthy.
- Plot `decision.telemetry.adaptiveScaleStep` to confirm autoscaler agility matches SLO burn.

## Suggested SLO profiles

| Profile           | Target p95 (ms) | Backlog target (s) | Cost/min ($) | Notes                                                             |
| ----------------- | --------------- | ------------------ | ------------ | ----------------------------------------------------------------- |
| Baseline          | 1500            | 90                 | 18           | Default values baked into `DEFAULT_QUEUE_SLO`.                    |
| Latency-sensitive | 900             | 60                 | 22           | Aggressive `latencyBurnThreshold` (1.05) and higher min replicas. |
| Budget-protecting | 1600            | 120                | 12           | Higher `costBurnThreshold` sensitivity and slower scale down.     |

## Rollout checklist

1. Deploy KEDA operator (v2.14+) and ensure Prometheus is reachable at `http://prometheus.monitoring.svc:9090`.
2. Apply the generated `ScaledObject` alongside the worker Deployment.
3. Add dashboards for SLO pressure, cost pressure, adaptive scale step, and queue depth.
4. Enable the burn-rate alert queries and validate they fire in staging before production rollout.
5. Track per-queue error budgets (`errorBudgetMinutes`) to tune cooldowns and scale steps.
