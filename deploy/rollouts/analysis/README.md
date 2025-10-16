# Argo Rollouts + Metrics Gates

Generated 2025-09-24T12:00:00.000000Z

This pack adds **Prometheus-backed AnalysisTemplates** and patches to your existing Rollouts so canary steps are **guarded by SLOs** (p95 latency, error rate, availability).

## Install

```bash
# 1) Apply templates
kubectl -n companyos apply -f deploy/rollouts/analysis/templates.yaml

# 2) Ensure ServiceMonitors feed Prometheus (kube-prometheus-stack)
kubectl -n monitoring apply -f monitoring/servicemonitors.yaml

# 3) Patch Rollouts to include analyses
kubectl -n companyos apply -f deploy/rollouts/analysis/patch-intelgraph-api.yaml
kubectl -n companyos apply -f deploy/rollouts/analysis/patch-companyos-console.yaml
Make sure your services expose /metrics and the Service has a port named http used by the ServiceMonitor.

How it works
After 10% and 50% phases, we run latency+error checks; after 25% we run availability.

Any failure trips the analysis and Argo Rollouts auto-aborts the canary (stays on stable).

Customize thresholds
Edit in deploy/rollouts/analysis/templates.yaml:

p95_threshold (seconds): e.g., 0.8 → 800ms

err_threshold (fraction): e.g., 0.02 → 2%

availability_threshold (fraction): e.g., 0.995 → 99.5%
```
