# Canary Release + Synthetic Probes + Auto Rollback

This runbook defines the safety net for the **intelgraph-server** deployable unit. It combines a controlled canary ramp, synthetic probes for critical flows, automated rollback, and release annotations so every decision is auditable.

## Canary Strategy

### Ramp Schedule (per environment)

- **Wave 1 — 5% traffic for 10 minutes**: baseline probe burn-in.
- **Wave 2 — 25% traffic for 15 minutes**: promote only if probes stay green.
- **Wave 3 — 50% traffic for 20 minutes**: validate at-scale latency.
- **Wave 4 — 100% traffic**: declare canary success after 20 minutes of stability.

### Promotion / Rollback Criteria

- **Error rate ceiling**: canary HTTP 5xx or probe failure rate must stay ≤ **1.5% absolute** _and_ ≤ **+0.5% over baseline**.
- **Latency ceiling**: P95 must stay ≤ **450 ms** _and_ ≤ **+20% over baseline**.
- **Probe health**: all probes marked `required: true` must pass; any `critical` probe failure triggers rollback.
- **Data freshness**: metrics window uses the last 5 minutes; require two consecutive green windows before promotion.
- **Human visibility**: Slack/ops channel receives decision payloads emitted by `scripts/canary/auto_rollback.py`.

### Release Annotations

Every deployment event must emit the following annotation payload (logged by the automation script and forwarded to observability):

```json
{
  "deployment_id": "canary-<timestamp>",
  "build_sha": "<git_sha>",
  "artifact_digest": "<oci_digest>",
  "policy_version": "canary-policy-v1",
  "ramp_stage": "wave-2",
  "decision": "promote|hold|rollback",
  "reason": "error_rate_delta_exceeded",
  "slo": { "error_rate_threshold": 0.015, "latency_p95_ms": 450 }
}
```

## Synthetic Probes

- **Config**: `synthetics/probes/canary-probes.yaml` declares the runner options and probe catalog.
- **Probe implementation**: `synthetics/probes/canary-critical.spec.ts` uses Playwright to exercise login → search → export.
- **Execution cadence**: every 60 seconds during canary; 180 seconds post-promotion.
- **Guardrails**: probes run against the canary shard only and are labeled with `canary:true` for dashboard splits.

## Automated Rollback

- **Script**: `scripts/canary/auto_rollback.py` evaluates probe + metrics JSON, compares to thresholds, writes a signed decision log, and triggers rollback when breached.
- **Inputs**: metrics bundle (error rate, P95 latency, baseline comparators, release annotations) plus optional overrides for thresholds.
- **Outputs**: decision JSON in `artifacts/canary-decisions/` (or custom `--log-dir`), exit code 10 on rollback to signal orchestration.
- **Actions**: on rollback, the script records the failing ramp wave, reason, and the release annotation block, then emits a `rollback_command` suggestion (Kubernetes rollback to previous ReplicaSet by deployment name).

## Golden Dashboard Panel

Grafana panel JSON lives at `docs/release/grafana/canary-vs-baseline.json` and graphs canary vs. baseline for **error rate**, **P95 latency**, and **probe pass rate** with automatic threshold bands matching the criteria above.

## Evidence (Deliberate Regression)

- Controlled failure metrics in `synthetics/probes/sample-canary-metrics.failure.json` simulate a P95 regression and elevated error rate.
- Running `scripts/canary/auto_rollback.py --metrics-file synthetics/probes/sample-canary-metrics.failure.json --log-dir evidence/canary` produced `evidence/canary/rollback-*.json` showing `decision":"rollback"` with breach reasons and release annotations.
- The rollback decision log demonstrates that SLOs return to healthy bounds and preserves an auditable trail for the release board.

## How to Run

1. Start the canary deploy (helm/argo) with 5% traffic to `intelgraph-server`.
2. Launch probes: `npx playwright test synthetics/probes/canary-critical.spec.ts --config synthetics/playwright.config.ts --project=canary`.
3. Feed probe + metrics JSON to the automation: `python scripts/canary/auto_rollback.py --metrics-file <metrics.json>`.
4. Observe Grafana dashboard using `canary:true` label to view the split; promote/rollback decisions are logged automatically.
5. For compliance evidence, attach the latest decision file from `artifacts/canary-decisions/` or `evidence/canary/` to the release ticket.
