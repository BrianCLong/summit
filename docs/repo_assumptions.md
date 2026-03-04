# Repo Assumptions

**Verified vs Assumed paths**
- Verified: `scripts/ci/governance-meta-gate.mjs` exists.
- Assumed: `agents/`, `tests/`, `docs/`, `.github/workflows/`, `artifacts/schemas/` exist or are created.

**CI check names**
- `check_plan_gate`
- `check_patch_policy`
- `check_never_log`
- `check_eval_min_score`

**Artifact schema**
- `artifacts/run_plan.json`
- `artifacts/execution_ledger.json`
- `artifacts/patch_stack.json`
- `artifacts/eval_report.json`
- `artifacts/policy_report.json`
- `artifacts/metrics.json`
- `artifacts/stamp.json`

**Must-not-touch list**
- existing artifact schemas
- CI workflow names
- security policy enforcement modules
