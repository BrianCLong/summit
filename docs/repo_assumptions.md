# SWE-rebench Subsumption Reality Check (Verified)

## Verified module paths (current state)

The following implementation surfaces already exist in-repo and are the canonical baseline for the next PR stack:

- Dataset ingestion: `datasets/swe-rebench/types.ts`, `datasets/swe-rebench/loader.ts`
- Evaluation runner: `evaluation/swe/runTask.ts`, `evaluation/swe/containerRunner.ts`, `evaluation/swe/reportGenerator.ts`
- Behavior reward logic: `src/evals/swe/behaviorReward.ts`
- Task validation gate: `src/evals/swe/taskValidator.ts`
- Security fixture: `tests/security/swe/malicious_repo.test.ts`

## Confirmed ownership boundaries

- Primary change zone: Documentation + SWE eval modules only.
- No edits to core CI gate workflows in this iteration.
- No lockfile/package-manager churn.

## Hard guardrails for next implementation PRs

1. Deterministic artifact contract remains mandatory: `report.json`, `metrics.json`, `stamp.json`.
2. Feature flag defaults stay OFF for any new runtime wiring.
3. No dataset replication; only metadata/manifests under version control.
4. Container execution must be policy-constrained (image allowlist + sandbox-first defaults).

## Readiness assertion

This repository is now positioned for implementation-first SWE-rebench increments because baseline paths are validated and guardrails are explicit. Remaining deltas should be delivered as small, test-backed PRs against these exact module locations.
