# Agentic Analytics 2026 — Runbook

## Purpose

Operational guidance for running and validating the agentic analytics workflow.

## Preflight

1. Confirm feature flag is OFF by default (`AGENTIC_ANALYTICS_ENABLED=false`).
2. Validate input dataset classification and access controls.
3. Verify budgets (step/time/token) are configured.

## Run (Local)

- Planned CLI (Phase 1): `pnpm agentic-analytics:run --input <dataset> --out <dir>`

## Outputs

- `report.json`: Findings + recommendations.
- `narrative.md`: Decision narrative (PII-redacted).
- `eval.json`: Guardrails + policy outcomes.
- `metrics.json`: Budget metrics.
- `stamp.json`: Deterministic stamp.

## Interpreting Evals

- **PII fail**: Narrative must be redacted; run is blocked until clean.
- **Injection fail**: Dataset content quarantined; run is blocked.
- **Budget exceed**: Follow-ups halted; run marked “needs human approval”.

## Budget Tuning

- Increase budgets only with explicit approval.
- Track deltas in `metrics.json` and compare to baseline.

## Incident Response

- If PII or injection failures recur, classify as a policy incident and notify governance.
- Preserve audit metadata; do not store raw datasets in incident artifacts.

## Rollback

- Disable feature flag and revert workflow code or docs.
