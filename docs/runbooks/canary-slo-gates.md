# Canary SLO Gates & Auto-Rollback Runbook

## Purpose

This runbook documents the SLO-gated canary and preview enforcement path. It ties HTTP golden-path probes, Prometheus SLO checks, and provenance/SBOM verification into the promotion and rollback flow.

## Preconditions

- Prometheus endpoint reachable from CI via `PROMETHEUS_BASE_URL`.
- Namespace carries correct labels (e.g., `intelgraph-pr-1234` for previews).
- Grafana dashboard `observability/grafana/dashboards/slo-overview.json` imported.
- `grype` available in CI runners or `vulnerability-report.json` supplied.

## Golden Path & SLO Verification

1. **HTTP probes**: `.ci/config/golden_paths.yml` defines per-service endpoints, expected status, p95 latency, and error budgets.
2. **Prometheus gates**: `.ci/config/slo.yml` defines service-specific PromQL queries and thresholds.
3. **Execution**: `.ci/scripts/verify_goldens.sh` runs probes and PromQL checks. Non-zero exit triggers halt/rollback.

### Manual invocation

```bash
PROMETHEUS_BASE_URL=https://prometheus.stage.intelgraph.dev \
PROM_NAMESPACE=intelgraph-staging \
TARGET_ENVIRONMENT=staging \
./.ci/scripts/verify_goldens.sh
```

## Provenance & SBOM Guard

- `.ci/scripts/verify_provenance.sh` enforces attestation presence and vulnerability budgets (critical=0, high=10 by default).
- Adjust budgets with `VULN_BUDGET_CRITICAL` / `VULN_BUDGET_HIGH` env vars if policy allows.

## Canary Promotion Flow

1. Deploy canary at 10% weight via `canary-deployment.yml`.
2. Run `verify_goldens.sh` (HTTP + PromQL) at 10%.
3. Ramp to 50% and 100% only if gates pass. Breach triggers `auto-rollback.yml`.
4. `canary-progress.yml` allows manual weight adjustments; it re-runs gates after each change.

## Rollback Playbook

1. Trigger GitHub Action `auto-rollback.yml` or re-run `canary-deployment.yml` with `action=abort`.
2. Confirm rollback health by re-running `verify_goldens.sh` with the prior namespace.
3. Validate in Grafana (SLO dashboard) and Jaeger (namespace filter) that error rate/latency have recovered.

## Dashboards & Alerts

- Grafana SLO dashboard link is posted to PRs by `preview-env.yml`.
- Configure alert destinations in Grafana to page on burn-rate breaches above configured thresholds.

## Incident Notes

- Capture trace IDs from `verify_goldens.sh` output when available and attach to incident tickets.
- If Prometheus is unreachable, fail the gate and investigate networking/secrets before proceeding.
