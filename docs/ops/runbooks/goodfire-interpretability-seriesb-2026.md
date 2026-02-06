# Runbook: Goodfire-Style Interpretability Monitoring (Summit)

## Purpose
Operate the Agent Behavior Monitor probe suite, interpret regressions, and preserve deterministic
artifacts for governance review.

## Update Probe Packs
1. Edit probe pack source (YAML/JSON) with stable IDs.
2. Recompute probe pack hash after normalization.
3. Run `pnpm summit:monitor:ci` and confirm deterministic artifacts.
4. Update thresholds policy if probe distribution changes.

## Interpret Regressions
- Review `artifacts/monitor/metrics.json` for aggregate deltas.
- Inspect `artifacts/monitor/report.json` for probe-level failures.
- Confirm schema validation and evidence ID stability before escalation.

## Rotate/Redact Artifacts
- Remove artifacts with sensitive data immediately.
- Re-run monitor after applying redaction policies.
- Archive only sanitized artifacts per retention policy.

## Alerting Assumptions
- CI failure is treated as the primary alert mechanism.
- External alerting integrations are deferred pending verification of alerting stack.

## Rollback Guidance
- Disable monitor gating by reverting the CI entrypoint change.
- Preserve evidence artifacts for post-incident review.
