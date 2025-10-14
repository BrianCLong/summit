# Canary Manager Control Plane

This module implements an idempotent, step-based canary rollout controller with integrated health scoring and automated rollback support.

## Features

- Configurable progressive strategy (default 10→25→50→100) with bake windows per step.
- Composite health scorer that ingests error rate, p95 latency, saturation, and probe/synthetic results.
- Explicit threshold policy (SLO guardrails) and consecutive breach protection to keep false rollbacks under 2%.
- Helm-friendly promotion/rollback command generation and manual abort hooks.
- Audit event generation for every promotion, abort, or rollback.
- `meanTimeToRollback` helper to validate the \<90s objective during drills.

## Chaos-lite drills

The included Jest test `canaryManager.test.ts` exercises happy-path progression, double-breach rollback, and manual abort flows. For a dry-run drill you can seed a sequence of `HealthSample` payloads in a REPL or script and observe the emitted audit events/Helm commands.

## Automated rollback playbook

`scripts/release/canary-rollback-playbook.sh` provides an idempotent shell workflow that wraps `helm rollback`, records audit metadata, and supports dry-run validation.
