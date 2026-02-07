# Repo Assumptions & Validation (Moltbook-Class Pack)

## Verified vs. Assumed Directory Layout

| Area | Verified Path | Status | Notes |
| --- | --- | --- | --- |
| Repo root | `/workspace/summit` | ✅ Verified | Working directory for this change. |
| Docs | `docs/` | ✅ Verified | Documentation root. |
| CI workflows | `.github/workflows/` | ✅ Verified | Cataloged in `README.md`. |
| Evidence tooling | `tools/evidence/` | ✅ Verified | Evidence validation + determinism gates. |
| CLI | `tools/summitctl/` | ✅ Verified | `summitctl` CLI package. |
| Tests | `tests/` | ✅ Verified | Root tests directory. |
| Artifacts | `artifacts/` | ✅ Verified | Evidence artifacts directory exists. |
| Eval profiles | `eval/` | ⚠️ Deferred pending confirmation | Multiple evals exist; agentic-platform location deferred pending confirmation. |
| Policy gates | `policy/` | ⚠️ Deferred pending confirmation | Location for deny-by-default policies deferred pending confirmation. |

## CLI Entrypoint
- Verified CLI name: `summitctl` (run via `npm run summitctl -- <command>`). See `tools/summitctl/README.md`.

## Evidence Schema Conventions
- Evidence bundles use `report.json`, `metrics.json`, and `stamp.json` files; timestamp isolation is enforced (timestamps only allowed in `stamp.json`). See `tools/evidence/verify_evidence.py`.

## CI Check Names & Gate Sources
- Required CI workflows are documented in `.github/workflows/README.md` (e.g., `ci.yml`, `ci-lint-and-unit.yml`, `ci-golden-path.yml`, `security.yml`).
- Gate IDs like `agentic_platform_secrets_gate` remain **deferred pending confirmation** until a gate registry is confirmed.

## Artifact Storage Conventions
- Evidence tooling in `tools/evidence/verify_evidence.py` expects `evidence/<EVIDENCE_ID>/{report.json,metrics.json,stamp.json}`.
- Release tooling references `artifacts/<slug>/stamp.json` for verification bundles.

## Must-Not-Touch Files (for this pack)
- Lockfiles: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `Cargo.lock`.
- Security policy files: `policy/defensive_only.yml`, `policy/innovation_flags.yml`.
- Branch protection workflows in `.github/workflows/`.
- Any files under `docs/governance/` unless explicitly scoped.

## Validation Checklist
1. Confirm eval profile location under `eval/` (or alternate) for agentic-platform pack.
2. Confirm CI gate registry for secrets/PII/provenance checks.
3. Confirm evidence schema IDs and whether a new schema entry is required.
4. Confirm artifact storage path for `artifacts/<slug>/` vs `evidence/<id>/`.
5. Confirm contribution/license rules for new docs in `docs/`.
