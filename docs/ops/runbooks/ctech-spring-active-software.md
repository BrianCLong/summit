# Runbook: Guardrailed Prompt → Procedure (P2P)

## Purpose

Operate and monitor Procedure compilation, validation, and drift detection safely.

## Kill Switch

1. Disable Procedure execution via the feature flag in `agentic/procedures/runtime`.
2. Confirm that runtime executors return `status: 'stubbed'`.
3. Notify security and platform owners.

## Safe Allowlist Changes

1. Update `agentic/procedures/policy/default.policy.yaml`.
2. Update the allowlist registry in `docs/standards/ctech-spring-active-software.md`.
3. Run `pnpm exec tsx scripts/procedures/lint.ts` to confirm goldens.
4. Regenerate goldens if required using `pnpm exec tsx scripts/procedures/compile_all.ts`.

## Drift Response

If `scripts/monitoring/ctech-spring-active-software-drift.ts` flags drift:

1. Review the report at `evidence/agentic-procedures-drift/report.json`.
2. Confirm whether policy was intentionally expanded.
3. If unapproved, revert policy changes and re-run lint.
4. Record rollback steps in the DecisionLedger and notify governance.

## Evidence & Audit

- Every run produces an evidence bundle under `evidence/agentic-procedures/`.
- Audit entries must include actor, Procedure ID, and policy version.

## Monitoring Signals

- Policy allowlist diffs
- Golden plan drift
- Validation failure counts
