# Summit Canary Deployment Playbook

This guide explains how to roll out Summit services with ArgoCD-managed canary deployments that gradually shift traffic based on live Prometheus metrics. The workflow uses Argo Rollouts to send 10% of traffic to a candidate release, validates it with automated analysis, and rolls back automatically if error thresholds are exceeded.

## Prerequisites

- **ArgoCD and Argo Rollouts** installed in the target cluster (the `argoproj.io` CRDs must already exist).
- Prometheus scraping the Summit services, exposing `http_requests_total` and `http_request_duration_seconds_bucket` metrics.
- Helm chart repository synced to the Summit `main` branch.
- (Optional) [`k6`](https://k6.io/) installed locally to replay synthetic traffic during verification.

## Deploy the ArgoCD Application

1. Apply or sync the ArgoCD root application if it is not already present:
   ```bash
   kubectl apply -f deploy/argocd/app-of-apps.yaml
   ```
2. Within the ArgoCD UI or CLI, sync the new `intelgraph-canary` application that targets the `helm/intelgraph` chart with the dedicated `values/canary.yaml` overrides.
3. Confirm that the `conductor-rollout` resource is created in the `intelgraph` namespace and references the `conductor-active` and `conductor-preview` services.

## Helm Configuration Highlights

The `helm/intelgraph/templates/rollout.yaml` manifest now uses a canary strategy with progressive steps:

- 10% of pods receive traffic for 5 minutes.
- Prometheus-backed analysis verifies success rate, error rate, and latency. A failure immediately aborts the rollout and scales the canary back.
- If metrics stay healthy, the rollout advances to 50% for 10 minutes with a second analysis gate before promoting to 100%.
- Optional smoke tests can run through the `rollout.tests` values toggle.

Key value overrides live in `helm/intelgraph/values.yaml` and `helm/intelgraph/values/canary.yaml`, which control traffic weights, pause durations, and metric thresholds. Adjust these defaults for different environments or service-level objectives.

## Monitoring and Rollback

Argo Rollouts continuously evaluates the Prometheus metrics defined in the `success-rate` analysis template. The thresholds map to:

- **Success rate** ≥ 95% (97% for canary overrides).
- **Error rate** ≤ 5% (3% for canary overrides) with rollback above 10% (8% in overrides).
- **P95 latency** ≤ 2s (1.5s in overrides).

If any threshold fails, Argo Rollouts automatically aborts the rollout, scales traffic back to the stable ReplicaSet, and surfaces the failure in both the Argo Rollouts dashboard and ArgoCD UI. You can inspect details with:

```bash
kubectl argo rollouts get rollout conductor-rollout -n intelgraph
kubectl argo rollouts abort conductor-rollout -n intelgraph  # optional manual intervention
```

## Synthetic Traffic with k6

Use the dedicated k6 scenario to generate a mixed stream of stable and canary traffic:

```bash
k6 run tests/k6/intelgraph-canary-validation.js \
  --env STABLE_URL="http://conductor-active.intelgraph.svc.cluster.local:8000/health" \
  --env CANARY_URL="http://conductor-preview.intelgraph.svc.cluster.local:8000/health" \
  --env CANARY_WEIGHT=0.1 \
  --env REQUEST_RATE=40 \
  --env TEST_DURATION=3m
```

The script emits dedicated `canary_success` and `canary_http_duration` metrics with thresholds aligned to the Helm configuration. Pair these numbers with the Argo Rollouts dashboard to validate that traffic gradually increases and that rollback triggers if errors rise above the configured ceiling.

## Operational Tips

- Tune `rollout.canary.*` values to control how quickly traffic shifts between phases.
- Update `rollout.metrics.*` to align with environment-specific service level objectives.
- Enable `rollout.tests.enabled` when you want to run smoke tests alongside metric analysis during each pause.
- Store Prometheus endpoints per environment with the `monitoring.prometheus.server` value so that the analysis template queries the right data source.

Following this playbook ensures safe, observable rollouts with automated rollback protection for Summit services.
