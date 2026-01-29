# Runbook — Narrative Ops Detection

## Purpose
Operational guide for the Narrative Ops Detection bundle.

## Common Failures
- **Verifier fails**: Check for missing manifest, evidence schemas, docs, or policy fixtures.
- **Determinism violation**: Ensure no timestamps are present in report.json or metrics.json.
- **Policy fixture regression**: Verify tests/policy fixtures match the policy.yaml rules.

## Alerts (spec)
- **Signal**: verifier failure rate > 5% on main.
- **Action**: block merge + open incident.

## SLO Assumptions
- CI verifier success >= 99%.
