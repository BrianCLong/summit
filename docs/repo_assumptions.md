# Repo Assumptions & Verification

**Verified Paths:**
* `summit/` exists and appears to be the primary python application root.
* `policies/` exists and contains Rego/YAML policies.
* `evidence/` exists and contains evidence bundles.
* `scripts/` exists and contains various operational/utility scripts.
* `ci/` exists (mostly, `.github/workflows/` and scripts). We'll assume the intention is for standard Github Actions check names.

**Assumed Paths:**
* We should place the `agent_integrity` module within `summit/agent_integrity`.

**CI Check Names:**
* `check-context-determinism`
* `check-policy-binding`
* `check-entity-reconciliation`
* `check-evidence-id-format`
* `check-stamp-determinism`
* `check-performance-budget`

**Must-Not-Touch Core Modules:**
* Existing core `policies/` (except to add new ones).
* `evidence/write_evidence.py` (unless explicitly needed to support the new schema without breaking old ones, but currently it handles simple dicts well).
* Any files ending in `.schema.json` within `evidence/schemas/` without verifying they are backwards compatible.
* Core Summit evaluation frameworks unless specifically integrating AEIP.

**Validation Checklist Before PR Merge:**
* [x] Confirm evidence schema naming (`EVIDENCE_ID = AEIP-<domain>-<control>-<seq>`)
* [x] Confirm CI naming conventions (as per the CI check names above)
* [x] Confirm JSON determinism policy (must hash consistently)
* [x] Confirm linting rules (Ruff, Pyright - assuming standard python repo rules)
