# 0017 - Drift Detection Scope & Thresholds

## Status

Accepted

## Context

Infrastructure and runtime configs can diverge from declared IaC, risking security gaps and downtime. A formal drift policy with severity thresholds is required for timely detection and safe remediation.

## Decision

- Run scheduled drift detection comparing Terraform/K8s desired state vs runtime every hour (staging) and nightly (prod).
- Severity levels: Info (non-functional metadata), Warn (config deltas without security impact), Critical (security/network/storage changes).
- Alert routing: Critical → PagerDuty; Warn → ticket + Slack; Info → logged only.
- Remediation playbook mandates canary apply with auto-rollback and smoke tests.

## Alternatives Considered

1. **Manual spot checks**: unreliable and slow; rejected.
2. **Terraform-only detection**: misses runtime config drift; rejected.
3. **Continuous apply**: fast convergence but riskier; rejected for cautious rollout.

## Consequences

- - Faster detection of risky drift; + predictable response steps.
- - Additional compute for scheduled checks; - requires maintenance of snapshot tooling.

## Validation

- Controlled drift drill in staging (ConfigMap mismatch) must alert within one cycle (<1h) and produce diff artifact.

## References

- `docs/wave13/drift-runbook.md`
- `docs/wave13/mission-25-32.md`
