# Repo Assumptions and Validation (Paper 2602.16742 Intake)

## Scope

This file records what is verified in the local workspace and what remains assumed for the
`2602.16742` subsumption PR sequence.

## VERIFIED

### Repository Structure

- Root contains active Summit zones including: `.github/`, `docs/`, `scripts/`, `tests/`,
  `pipelines/`, `summit/`, `server/`, `client/`, `packages/`, `services/`, `evidence/`.
- Paper-specific target paths already exist for PR1 docs:
  - `docs/standards/`
  - `docs/security/data-handling/`
  - `docs/ops/runbooks/`
- There is no canonical `summit/evaluators/` directory in this repo; evaluator entrypoints are
  distributed across:
  - `summit/evals/`
  - `summit/eval/`
  - `summit/eval_harness/`

### Canonical Evidence Schemas and Artifacts

- Evidence triad is enforced across the codebase:
  - `report.json`
  - `metrics.json`
  - `stamp.json`
- Canonical schema locations verified:
  - `evidence/report.schema.json`
  - `evidence/metrics.schema.json`
  - `evidence/stamp.schema.json`
  - `evidence/index.schema.json`
  - `summit/evidence/schemas/report.schema.json`
  - `summit/evidence/schemas/metrics.schema.json`
  - `summit/evidence/schemas/stamp.schema.json`
  - `summit/evidence/schemas/index.schema.json`
- Required core field across report/metrics is `evidence_id` (not `source_url`).
- Hash integrity is supported via index-level `sha256` fields in Summit evidence schema.

### Deterministic Artifact Rules

- Determinism rule is explicit: timestamps are allowed only in `stamp.json`.
- Verifiers implementing this rule are present:
  - `summit/evidence/verifier.py`
  - `summit/evidence/verify.py`
  - `summit/ci/verify_evidence.py`

### CI Required Check Names (Local Source of Truth)

From `summit/ci/required_checks.json`:

- `summit-ci/evidence-verify`
- `summit-ci/prompt-determinism`
- `summit-ci/tool-schema-drift`
- `summit-ci/policy-gates`
- `summit-ci/unit`

### Pipeline Naming Conventions

- Pipeline manifest names are DNS-compatible lowercase kebab-case via
  `pipelines/schema/pipeline-manifest.schema.json`:
  - Pattern: `^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`
- Task IDs are constrained to lowercase plus underscore/hyphen:
  - Pattern: `^[a-z0-9_-]+$`
- This repo does not enforce `snake_case` for pipeline names; it uses kebab-case/DNS-safe names.

### Security and Policy Defaults

- Deny-by-default posture is present in multiple policy components:
  - `summit/policy/engine.py`
  - `summit/policy/router.py`
  - `solo_os/governance/policy.default.json` and `solo_os/README.md`

## ASSUMED / DEFERRED

- Exact branch-protection required checks in GitHub settings are not locally verifiable without
  GitHub API/UI access. Local fallback used: `summit/ci/required_checks.json`.
- Any "single main evaluator" file is not canonical in this codebase; evaluator ownership appears
  multi-entrypoint.

## Must-Not-Touch List (for 2602.16742 PR1-PR5)

Unless explicitly in scope, do not modify:

- Governance authority files:
  - `docs/SUMMIT_READINESS_ASSERTION.md`
  - `docs/governance/CONSTITUTION.md`
  - `docs/governance/META_GOVERNANCE.md`
  - `docs/governance/AGENT_MANDATES.md`
- CI gate contracts:
  - `summit/ci/required_checks.json`
  - `summit/ci/verifier/verify_required_checks.py`
- Evidence schema contracts:
  - `evidence/*.schema.json`
  - `summit/evidence/schemas/*.json`
- Pipeline registry contracts:
  - `pipelines/schema/pipeline-manifest.schema.json`
  - `pipelines/registry/core.py`
- Broad evaluator harness entrypoints:
  - `summit/evals/harness.py`
  - `summit/eval_harness/run.py`
- Environment/secrets and lockfiles:
  - `.env*`
  - `pnpm-lock.yaml`

## Validation Checklist Status

- [x] Confirm canonical evidence schema (`evidence_id`, hash support, triad files).
- [x] Confirm CI check names and local status-gating source.
- [x] Confirm deterministic artifact rules (timestamps only in `stamp.json`).
- [x] Identify must-not-touch files (pipeline registry + evaluator harness surfaces).
- [x] Confirm naming conventions for pipelines (kebab-case DNS-safe, not snake_case).
- [x] Confirm security policy defaults (deny-by-default patterns present).
