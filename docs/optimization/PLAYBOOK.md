# Optimization Playbook

A repeatable process for quarterly cost/performance improvements aligned to roadmap milestones.

## Workflow

1. **Baseline**: Refresh `artifacts/cost_perf/latest.json` via `scripts/verify_cost_perf_guardrails.sh --record`.
2. **Prioritize**: Use ROI table (`docs/optimization/ROI_OPTIMIZATIONS.md`) and roadmap pressure (`docs/strategy/ROADMAP_PRESSURE.md`).
3. **Design**: Define kill switches, telemetry, and acceptance metrics before coding.
4. **Implement**: Ship minimal, reversible changes in a single zone (server/web/docs) per PR.
5. **Verify**: Run guardrails workflow and record before/after metrics with evidence.
6. **Document**: Update ledger, reinvestment plan, and capacity release docs.
7. **Guard**: Ensure CI guardrail stays green; set alerts on sustained drift.

## Decision Thresholds

- Target ROI > 10% latency reduction or > $500/month savings per change.
- Do not proceed without kill switch and measurement plan.
- Reject changes that weaken SLAs or lack reproducible evidence.

## Approval Flow

- Proposed optimization reviewed by: owner, SRE, governance.
- Reinvestment approval by roadmap DRI + governance.
- Guardrail/budget updates require evidence and governance sign-off.

## Observability Checklist

- Metrics: latency p95/p99, error_rate, cost_per_1k_tokens, avg_tool_invocations.
- Traces: annotate runs with `optimization_id`.
- Logs: emit structured entries for cache hits/misses and kill-switch toggles.

## Incident Response

- If guardrail fails: rollback or toggle kill switch within 30 minutes.
- File incident with root cause, metric deltas, and prevention steps.
